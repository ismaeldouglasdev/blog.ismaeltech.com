---
title: "UUID v4: por que o ID aleatório ainda é a escolha certa"
date: "2026-10-03"
category: "tutorial"
tags: ["uuid", "javascript", "banco-de-dados"]
excerpt: "Identificador universalmente único parece ganho de tempo até você precisar de um índice no Postgres e o tamanho do ID começa a doer. Um olhar honesto sobre quando usar UUID e quando não usar."
share_hook: "UUID é o padrão da indústria por um motivo razoável, e também por um motivo que pouca gente admite: ele tira o trabalho de coordinating inserts."
lang: "pt"
---

Existe um momento, em todo projeto que cresce, em que o id da tabela deixa de ser
um inteiro. Você começa com `SERIAL`, o `id` é 1, 2, 3, e tudo funciona. Depois
precisa mesclar dois ambientes, importar dados, receber eventos de outra máquina
que não passou pelo seu banco, e o `1` deixa de ser uma verdade.

É nesse momento que a maioria das pessoas chega ao UUID. E chega achando que o
UUID resolve um problema de unicidade. Resolve, sim — mas essa é a parte menos
interessante dele.

## O que o UUID realmente é

UUID significa Universally Unique Identifier: um identificador de 128 bits
padronizado na RFC 4122, escrito como oito-quatro-quatro-quatro-doze caracteres
hexadecimais:

```
9f8e7d6c-5b4a-4392-8180-7f6e5d4c3b2a
```

O "universalmente" é o que incomoda. Não é uma propriedade mágica do número — é
uma propriedade do **processo que o gera**. Ninguém coordena esses IDs. Cada
máquina, cada serviço, cada browser gera os seus, e a chance de colisão entre
dois deles é desprezível.

Esse detalhe tem uma consequência que vale guardar: o UUID funciona bem *justamente
quando não existe um lugar central*. É por isso que ele domina em filas de
mensagem, sistemas distribuídos e qualquer lugar onde doisigdadores precisam
concordar sobre um id sem falar com um banco.

## A anatomia de um UUID v4

Um UUID não é 128 bits de aleatoriedade. Tem estrutura, e a estrutura é o que
distingue as versões.

Num UUID v4 como `9f8e7d6c-5b4a-4392-8180-7f6e5d4c3b2a`:

- O primeiro bloco `9f8e7d6c` são 32 bits aleatórios
- O segundo bloco `5b4a` começa com o nibble `4` — o **identificador de versão**
- O terceiro bloco `4392` começa com `4`, `5`, `8` ou `9` — o **variante** (o
  layout binário reservado pela RFC)
- O resto é aleatório

Ou seja: 122 bits de entropia útil, não 128. Essa é a conta por trás da famosa
frase sobre o número de错 que você precisaria gerar para ter uma chance de 50%
de colidir.

## O custo que ninguém menciona

UUID v4 puro, sem nada em cima, é uma string de **36 caracteres**. Duas
consequências:

**Espaço em índice.** Uma chave primária `UUID` como `TEXT` ou `VARCHAR(36)` é
não só maior que um `BIGINT`, como tem alinhamento ruim em quase tudo. Em um
Postgres, um `UUID` de 16 bytes puro é prático; `VARCHAR(36)` é desperdício. A
prática comum é armazenar como `UUID`/`BYTEA` e expor como string.

**Ordenação.** UUID v4 é aleatório. primary key, isso vira page split: cada
insert em qualquer lugar do índice pode empurrar páginas. Numa tabela de alta
escrita, o custo é real e aparece no `pg_stat_user_indexes` ou em `INSERT`s que
levam milissegundos.

Existem saídas para ambos, e vale conhecer antes de escolher. **UUID v7** é a
resposta direta: tem 48 bits de timestamp no topo e o resto aleatório. Continua
sendo UUID — mesmo formato, mesma compatibilidade — mas ordena por tempo, o que
resolve page split e deixa o índice behave como o de um inteiro crescente. Para
a maioria dos sistemas novos, é a escolha que eu faria sem pensar muito.

## Quando não usar UUID

- **Chave de usuário exposta e ordernada ao mesmo tempo.** Se a ordem de
  inserção importa para o cliente, um inteiro crescente é mais simples e não
  entrega nada de graça.
- **Banco com consulta por prefixo.** `WHERE id LIKE '9f8e%'` em UUID v4 não usa
  índice; em v7, prefixo é timestamp, e aí funciona.
- **Table que nunca vai ser mergeada nem importada.** Se só existe num banco e
  ninguém mais consome o id, `SERIAL`/`BIGSERIAL` é mais simples.

E há o extremo oposto: **você não precisa do identificador inteiro**. Muita
gente usa UUID e mantém um `id` sequencial junto, o que duplica o trabalho sem
motivo.

## Quando usar

- Duas ou mais fontes escrevem na mesma tabela
- Filas viajam entre ambientes e precisam colar sem renomear
- O id é criado no cliente e o banco não deve ser consultado para isso
- Um dia você vai abrir o projeto e alguém vai gerar id em outro lugar

Nesses casos, UUID é a resposta com menos risco de quem não sabe o futuro.

## Gerando corretamente em JavaScript

Um detalhe que aparece em revisão de código: **não use `Math.random()`**.

```js
// Funciona até alguém precisar. Math.random não é CSPRNG.
function idRuim() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
```

`Math.random()` não é gerador criptográfico, e o gerador do npm `uuid` usava
`Math.random()` como fallback até a versão 9. Com APIs que evoluem, ele próprio
virou dependência desnecessária: `crypto.randomUUID()` está no navegador e no
Node.js e faz o serviço completo.

```js
// Um caminho só. O resto da aplicação não sabe de onde veio o id.
export function gerarLote(quantidade) {
  return Array.from({ length: quantidade }, () => crypto.randomUUID());
}
```

Se o ambiente não tiver `crypto.randomUUID()` — o caso é raro, mas existe no
Node antigo e em contexto não seguro — o fallback é `crypto.getRandomValues()`
com a versão e a variante ajustadas à mão:

```js
function uuidV4Fallback() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versão 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
```

Para gerar um ou alguns, isso basta. Quando precisar de dezenas, dá para fazer
por conta própria — mas nesse ponto a pergunta que vale é se você está gerando
milhares de ids no cliente por request, sinal de que a arquitetura pede
discussão.

Se precisar gerar um lote agora, o [gerador de UUID v4](/ferramentas/uuid) faz
isso sem te obrigar a pensar em nada disso.

## O resumo

UUID é o padrão da indústria porque resolve o problema certo: dispensa
coordenação. O preço é o índice, e o preço cai se você escolher **v7** em vez de
`v4`. Fora do caso distribuído, ele é complexidade que você comprou sem
precisar.