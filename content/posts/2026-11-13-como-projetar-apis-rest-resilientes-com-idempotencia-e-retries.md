---
title: "Como projetar APIs REST resilientes com idempotência e retries"
date: "2026-11-13"
category: "tutorial"
tags: ["api", "rest", "resiliência", "backend", "boas-práticas"]
excerpt: "Falhas de rede e timeouts fazem parte da vida de qualquer API. Veja como combinar idempotência, retries com backoff e limites claros para evitar duplicidades e manter o sistema estável."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-11-13-como-projetar-apis-rest-resilientes-com-idempotencia-e-retries.jpg"
lang: "pt"
---

Falhas de rede e timeouts fazem parte da vida de qualquer API em produção, e ignorar esse fato costuma custar caro: cobranças duplicadas, pedidos criados duas vezes e estados inconsistentes entre serviços. Se você já precisou explicar por que um clique gerou dois registros, sabe que resiliência não é luxo, é requisito. Neste guia prático, você vai ver como projetar APIs REST mais confiáveis combinando idempotência, retries controlados e respostas previsíveis para que o cliente possa tentar de novo sem medo.

## Por que falhas acontecem mesmo com código correto

Uma chamada HTTP pode falhar em muitos pontos: DNS instável, perda de pacote, balanceador reiniciando, deploy no meio da requisição ou simplesmente um timeout no cliente. O problema mais traiçoeiro é o timeout ambíguo: o cliente não recebeu resposta, mas o servidor pode ter processado a operação. Repetir a requisição "no automático" parece inofensivo, mas em operações que criam ou cobram algo o efeito colateral acontece de novo.

Resiliência, nesse contexto, não significa que nada vai falhar. Significa que falhas são esperadas e tratadas de forma segura. Para isso, duas ideias caminham juntas: tornar operações repetíveis sem efeitos duplicados (idempotência) e definir quando, como e quantas vezes vale a pena tentar novamente (retries).

## Idempotência: repetir sem duplicar efeitos

Em APIs REST, métodos como `GET`, `PUT` e `DELETE` são normalmente tratados como idempotentes: executar a mesma requisição várias vezes deve levar ao mesmo estado final. Já o `POST`, usado com frequência para criar recursos ou iniciar pagamentos, não é idempotente por natureza. É aí que entra a **chave de idempotência**.

A estratégia é simples: o cliente gera um identificador único para a intenção da operação (por exemplo, um UUID) e o envia em um cabeçalho como `Idempotency-Key`. O servidor armazena o resultado associado a essa chave. Se receber outra requisição com a mesma chave, em vez de processar tudo de novo, ele devolve o resultado original.

```http
POST /v1/charges HTTP/1.1
Host: api.exemplo.com
Content-Type: application/json
Idempotency-Key: 8d5f1b5c-5f0b-4f3b-a2b1-1d2a9c0e4f10

{
  "amount": 4990,
  "currency": "BRL",
  "customer_id": "cus_123"
}
```

Do lado do servidor, a chave precisa estar vinculada ao contexto correto (por exemplo, cliente + endpoint + chave) e ter um tempo de retenção razoável. Guardar a chave sem o corpo/resultado da operação não resolve: o objetivo é retornar a mesma resposta (ou um estado equivalente) quando houver repetição.

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-11-13-como-projetar-apis-rest-resilientes-com-idempotencia-e-retries-1.jpg" alt="Fluxo de retry seguro com chave de idempotência entre cliente, API e serviço" loading="lazy">
<figcaption>Com uma Idempotency-Key persistida, o cliente pode reenviar a mesma requisição após timeout sem criar efeitos colaterais duplicados.</figcaption>
</figure>

## O que guardar e como responder

Um desenho robusto de idempotência costuma registrar: chave, hash da requisição, status da operação (em andamento, concluída, falhou) e a resposta produzida. Alguns cuidados importantes:

- **Mesma chave, corpo diferente:** trate como erro (por exemplo, `409 Conflict` ou `422`), pois indica reutilização incorreta da chave.
- **Requisição em andamento:** se chegar outra chamada com a mesma chave enquanto a primeira ainda processa, você pode aguardar brevemente e responder com o resultado, ou retornar um estado indicando processamento em curso.
- **Falhas determinísticas:** se a operação falhou por erro de validação, faz sentido cachear essa falha para a mesma chave, evitando comportamentos diferentes para a mesma intenção.
- **Escopo e expiração:** defina por quanto tempo a chave é válida (horas ou dias, conforme o caso de uso) e limite o escopo para evitar colisões.

Esse padrão remove a maior parte do risco de duplicidade, mas ele só funciona bem quando o cliente também sabe **quando** deve tentar de novo.

## Retries com backoff e jitter

Nem todo erro merece retry. Como regra prática, faz sentido tentar novamente em falhas transitórias: timeouts, erros de conexão e respostas `429` (rate limit) ou `5xx`. Já erros `4xx` de validação (como `400` ou `401`) geralmente indicam problema na requisição e não devem ser repetidos automaticamente.

Quando houver retry, evite repetições imediatas em rajada. A abordagem recomendada é o **backoff exponencial com jitter**: aumente o intervalo entre tentativas (1s, 2s, 4s, 8s...) e aplique uma variação aleatória para evitar que muitos clientes tentem de novo ao mesmo tempo e derrubem o serviço que acabou de se recuperar.

```python
import random
import time

import requests

def post_with_retry(url, payload, headers, attempts=5):
    for attempt in range(attempts):
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=5)
            if resp.status_code >= 500 or resp.status_code == 429:
                raise RuntimeError(f"transient: {resp.status_code}")
            return resp
        except Exception:
            if attempt == attempts - 1:
                raise
            base = 2 ** attempt
            sleep_for = base + random.uniform(0, 0.5 * base)
            time.sleep(sleep_for)
```

Repare em dois pontos: o exemplo limita o número de tentativas e só repete falhas transitórias. Em sistemas críticos, combine isso com **timeout por chamada**, **circuit breaker** e métricas para saber quando o retry está ajudando ou apenas amplificando o problema.

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-11-13-como-projetar-apis-rest-resilientes-com-idempotencia-e-retries-2.jpg" alt="Gráfico de backoff exponencial com jitter entre tentativas de requisição" loading="lazy">
<figcaption>Backoff exponencial espaça as tentativas e o jitter reduz picos sincronizados de tráfego durante incidentes.</figcaption>
</figure>

## Boas práticas para clientes e servidores

Resiliência funciona melhor quando cliente e servidor compartilham um contrato claro:

- **Torne o comportamento explícito:** documente quais erros são retentáveis, se a API suporta `Idempotency-Key` e por quanto tempo o resultado é armazenado.
- **Use códigos e mensagens consistentes:** `429` com `Retry-After`, erros `5xx` para falhas transitórias e respostas estáveis para replays de idempotência ajudam o cliente a decidir.
- **Defina limites:** número máximo de retries, tempo total de espera e deadlines por operação evitam que uma falha vire lentidão em cascata.
- **Observe o sistema:** registre tentativas, colisões de chave e latência. Sem observabilidade, você não sabe se a proteção está funcionando.

Essas medidas não eliminam incidentes, mas reduzem bastante o impacto quando algo sai do esperado — que, mais cedo ou mais tarde, sempre sai.

## Conclusão

Projetar APIs REST resilientes é menos sobre impedir falhas e mais sobre lidar com elas sem corromper dados. Idempotência protege contra duplicidades em cenários de timeout ambíguo, enquanto retries com backoff e jitter dão ao sistema uma chance de se recuperar de instabilidades transitórias. Ao combinar um contrato claro, chaves de idempotência bem implementadas e políticas de retry criteriosas, você oferece uma experiência muito mais previsível para quem consome sua API e dorme mais tranquilo quando a rede resolve falhar.

## Fontes

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) - Definições de métodos HTTP, semântica de idempotência e códigos de status.
- [MDN Web Docs: HTTP request methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) - Visão prática sobre propriedades dos métodos, incluindo idempotência e segurança.
- [AWS Architecture Blog: Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) - Explicação e comparações de estratégias de backoff e jitter para retries.
- [Stripe API: Idempotent requests](https://docs.stripe.com/api/idempotent_requests) - Exemplo real de uso de chaves de idempotência em APIs de pagamento.
- [Google Cloud: Retry strategy](https://cloud.google.com/storage/docs/retry-strategy) - Recomendações sobre quando e como aplicar retries em chamadas de rede.
