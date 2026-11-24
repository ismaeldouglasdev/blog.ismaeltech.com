---
title: "Agentes de IA: o caro não é escrever código, é decidir"
date: "2026-11-23"
category: "article"
tags: ["ia", "agentes", "engenharia", "produtividade", "arquitetura"]
excerpt: "Ponytail e improve apontam para a mesma virada: julgar e planejar com o modelo caro, executar com o barato. O lucro vem do código que você não escreve."
cover:
  image: "/covers/2026-11-23-agentes-de-ia-o-caro-e-decidir.jpg"
lang: "pt"
translationKey: "2026-11-23-agentes-de-ia-o-caro-e-decidir"
---

Você pede um date picker. O agente devolve 335 linhas, instala uma biblioteca e monta um calendário que ninguém pediu. Outro agente, com uma regra diferente no repositório, olha o componente `Input` que já existe, usa o `type="date"` do navegador e escreve dez linhas. A diferença não estava no modelo. Estava na decisão que veio antes do primeiro `git apply`.

Essa é a ideia por trás de dois projetos que apareceram com força nos trendings desta semana: [ponytail](https://github.com/DietrichGebert/ponytail) e [improve](https://github.com/shadcn/improve). Um diz que o melhor código é o código que você nunca escreveu. O outro diz para usar o modelo mais caro para auditar e planejar, e deixar a execução para modelos mais baratos. Soam como conselhos opostos. Na prática, são a mesma tese com duas metades.

## Ponytail: preguiça na solução, rigor na leitura

O ponytail é um prompt único, distribuído como skill para Claude Code, Codex, OpenCode, Cursor e outros agentes. Ele tenta reproduzir aquele dev sênior que já viu o mesmo problema cinquenta vezes: olha o seu pedido, não diz nada, e troca cinquenta linhas por uma.

O mecanismo é uma escada. Antes de escrever, o agente precisa parar no primeiro degrau que resolve:

<figure>
<img src="/media/2026-11-23-agentes-de-ia-o-caro-e-decidir-1.svg" alt="Escada de sete degraus: necessidade, código existente, biblioteca padrão, recurso nativo, dependência instalada, uma linha, mínimo com teste" loading="lazy">
<figcaption>A escada do ponytail: a ordem importa porque o degrau mais barato quase sempre está mais perto do que parece.</figcaption>
</figure>

1. Isso precisa existir?
2. Já existe alguma coisa no repositório que faz isso?
3. A biblioteca padrão resolve?
4. A plataforma já oferece o recurso?
5. Uma dependência já instalada resolve?
6. Dá para fazer em uma linha?
7. Só então, o mínimo que funciona, com um teste pequeno se houver lógica.

O detalhe que mais importa está fora da escada: o autor insiste que a preguiça é da solução, nunca da leitura. O agente lê o código que a mudança toca e rastreia o fluxo real antes de escolher um degrau. Validação em fronteira de confiança, tratamento de perda de dados, segurança e acessibilidade não entram na lista de cortes. O objetivo não é ganhar tokens. É escrever só o que a tarefa exige.

Os números divulgados no README são fortes: 53% menos código, 45% menos tokens e 26% menos custo na versão 5, com 98% das lógicas arriscadas cobertas por teste contra 68% sem a skill. São números do benchmark dos autores, feito com 39 tarefas e cinco repetições. Não reproduzi aqui. Ainda assim, a direção é coerente com o que qualquer revisão de PR já mostrou: código morto é passivo técnico que ninguém paga no dia em que é escrito.

## Improve: o plano é o produto

O improve, do shadcn, vai por outro caminho. Ele é uma skill que audita o repositório e escreve planos em `plans/`. A regra central: o modelo mais capaz faz a parte em que inteligência compõe, entendendo o código, julgando o que vale a pena e escrevendo a especificação. Modelos mais baratos executam.

A saída não é código. É um arquivo markdown com contexto suficiente para um executor que nunca viu a conversa original. Isso resolve um problema que qualquer pessoa que já delegou tarefa conhece: o plano que existe só na cabeça do agente que o criou não sobrevive à troca de sessão.

<figure>
<img src="/media/2026-11-23-agentes-de-ia-o-caro-e-decidir-2.svg" alt="Fluxo: modelo caro audita e escreve plano, plano vira arquivo com gates, modelo barato implementa e testa, humano revisa o diff" loading="lazy">
<figcaption>O plano vira contrato: quem executa não precisa adivinhar o que o auditor quis dizer.</figcaption>
</figure>

Três propriedades tornam esses planos executáveis:

- **Autocontidos.** Caminhos exatos, trechos do estado atual, convenções do repo com um arquivo de exemplo e comandos já verificados. Nada de "como discutimos acima".
- **Gates de verificação.** Cada passo termina com um comando e a saída esperada. O executor não precisa julgar se deu certo.
- **Limites duros.** Lista do que está fora de escopo e condições STOP para quando a realidade não bater com o plano.

O improve também tem uma etapa de reconciliação: verifica o que foi aplicado, reescreve o que mudou de lugar e aponta o que ficou travado. Isso é camada a mais sobre um problema comum: backlog de plano que envelhece e ninguém ousa apagar.

## A convergência

Os dois projetos chegam no mesmo ponto por rotas diferentes.

O ponytail ataca o excesso de código. O improve ataca o excesso de decisão mal documentada. Um reduz o que é escrito. O outro reduz o que precisa ser interpretado de novo. Ambos deslocam o trabalho caro para antes da edição.

Há uma conta simples por trás disso. Uma hora de modelo caro para entender um subsistema e escrever um plano de 200 linhas. Vinte minutos de modelo barato para executar esse plano com gates. Se o executor tivesse que entender o subsistema sozinho, gastaria mais tempo e erraria mais. O custo não some. Ele muda de lugar: da digitação para o julgamento.

Isso também explica por que usar o modelo mais barato para tudo quase sempre rende menos do que parece. Economizar no diagnóstico é o jeito mais caro de baratear um projeto. O modelo barato compensa quando o problema já foi decomposto e a verificação é mecânica.

## Como aplicar sem adotar mais uma ferramenta

Você não precisa instalar nenhum dos dois para usar a ideia. O que precisa mudar é a ordem do pedido.

**1. Peça leitura antes de pedir código.** "Leia estes quatro arquivos, me diga onde essa mudança toca e o que já existe que resolve." Só depois: "Agora escreva o plano."

**2. Coloque a escada no AGENTS.md.** Cinco linhas bastam:

```markdown
Antes de escrever codigo:
1. O item existe no repo?
2. A stdlib resolve?
3. O recurso nativo da plataforma resolve?
4. Uma dependencia ja instalada resolve?
5. So então escreva o minimo, com teste para logica com branch.
Nunca corte validacao de fronteira, seguranca, perda de dados ou acessibilidade.
```

**3. Guarde planos em arquivo.** Use `plans/001-*.md` com estado atual, passos numerados, comando de verificação e condição STOP. Se o plano não cabe num arquivo, ele ainda não está pronto para execução.

**4. Meça reuso.** Toda resposta do agente deveria terminar com o que foi reaproveitado e o que foi criado. Se a proporção estiver sempre invertida, a regra não está sendo seguida.

**5. Revise como quem vai ser chamado às 3h.** O review do ponytail lê o código ao redor da mudança, não só o diff. Foi assim que ele encontrou um campo renomeado que quebrava um feed em arquivo não tocado. Esse tipo de falha é exatamente o que passa quando o executor só conhece as linhas que mudou.

## Onde isso não se aplica

Greenfield pequeno e protótipo descartável não precisam de auditoria de 200 linhas. Se você está testando uma ideia que vai morrer amanhã, escrever o código é a forma mais rápida de aprender. Também há casos em que a restrição é artificial: um exercício, uma entrevista, um benchmark. Cobrar reuso nesses casos atrapalha.

Outro limite honesto: a escada exige conhecimento do codebase. Em projeto grande mal documentado, o modelo caro vai gastar tempo só para descobrir onde as coisas estão. Isso não é falha da abordagem, é o preço da dívida de documentação aparecendo na fatura.

## O que fica

A mudança não é usar menos IA. É usar IA no lugar certo. Julgamento continua sendo a parte escassa. Digitação virou commodity. Quando você separa as duas coisas, o resultado é menor, mais barato e mais fácil de revisar, com a vantagem de o plano sobreviver à sessão em que foi escrito.

Os dois projetos valem uma leitura, mesmo que você não instale nada: [ponytail](https://github.com/DietrichGebert/ponytail) para a escada e o review, [improve](https://github.com/shadcn/improve) para o formato de plano. Os dois são MIT.

Tem um projeto parecido? [Vamos conversar](https://ismaeltech.com/#contato).
