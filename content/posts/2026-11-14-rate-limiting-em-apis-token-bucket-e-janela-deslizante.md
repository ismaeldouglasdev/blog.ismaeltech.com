---
title: "Rate limiting em APIs: token bucket, janela deslizante e onde aplicar o limite"
date: "2026-11-14"
category: "tutorial"
tags: ["api", "rate-limiting", "backend", "resiliência", "boas-práticas"]
excerpt: "Um pico de tráfego não precisa derrubar seu serviço. Veja como escolher entre token bucket e janela deslizante, onde aplicar o limite e como responder com 429 e Retry-After."
share_hook: "O pico que derruba a API quase nunca é um ataque: é um cliente legítimo sem controle de ritmo. Rate limiting é o freio que falta."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-11-14-rate-limiting-em-apis-token-bucket-e-janela-deslizante.jpg"
lang: "pt"
---

Você já recebeu o alerta de madrugada: o p95 explodiu, o banco de dados saturou e nenhuma linha de código mudou desde a tarde. A causa, quando aparece no log, é constrangedora de simples — um único cliente sincronizou dois cron jobs e disparou duzentas requisições por segundo contra um endpoint que custa caro. Ninguém atacou seu sistema; foi falta de freio. Rate limiting é esse freio: um contrato explícito de quanto cada consumidor pode exigir do seu serviço, aplicado antes que o estrago aconteça. Neste guia, você vai ver como os limites funcionam por dentro (token bucket, janela fixa e janela deslizante), onde aplicá-los na arquitetura e como devolver respostas que ensinam o cliente a se comportar em vez de só gritar `429`.

## O que rate limiting resolve (e o que não resolve)

Limitar a taxa de requisições é uma decisão de proteção e de justiça ao mesmo tempo. Proteção, porque qualquer endpoint que dispare consulta cara — relatório, busca full-text, exportação — vira uma arma nas mãos de um loop mal escrito. Justiça, porque sem limite um inquilino barulhento (no jargão, *noisy neighbor*) consome a capacidade que pertence a todos. Um limiar bem calibrado garante que a carga de um cliente não degrade a latência dos outros.

Dito isso, rate limiting não é milagre. Ele não substitui autenticação (limite por IP não identifica usuário), não protege de lógica abusiva dentro do limite contratado (duzentas requisições legítimas podem custar tanto quanto um ataque) e não resolve picos de demanda genuína — para isso existem filas, cache e escalonamento horizontal. Trate o limite como parte de um contrato: ele diz "até aqui você consegue"; o que fazer quando bater no teto é um combinado que precisa estar escrito na resposta.

## Token bucket: rajada suportada, ritmo limitado

O algoritmo mais usado em produção é o *token bucket*. A ideia é literal: existe um balde com capacidade para N tokens. Um "registro" (drip) repõe tokens em ritmo fixo — digamos, 10 por segundo. Cada requisição precisa consumir um token para passar. Se o balde tem tokens, a requisição é aprovada na hora; se está vazio, ela recebe `429 Too Many Requests`.

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-11-14-rate-limiting-em-apis-token-bucket-e-janela-deslizante-1.jpg" alt="Fluxo do token bucket com recarga fixa de tokens, decisão por requisição e caminho de aprovação ou 429" loading="lazy">
<figcaption>No token bucket, a recarga é constante e a aprovação consome um token: picos curtos passam, o ritmo médio fica limitado.</figcaption>
</figure>

A propriedade mais útil desse desenho é o comportamento frente a rajadas. Como o balde guarda tokens que não foram usados, um cliente que ficou quieto por dez segundos acumula "crédito" e pode disparar uma rajada curta sem tomar erro — desde que a rajada caiba no balde. Depois, o ritmo volta a ser ditado pela taxa de recarga. Na prática, isso modela bem a vida real: clientes legítimos não são perfeitamente constantes, eles pulsam. Dois parâmetros controlam tudo: **capacidade** do balde (tamanho da rajada aceitável) e **taxa de recarga** (ritmo sustentável). Um bucket de 50 com recarga de 5/s aceita um burst de 50 seguido de 5 requisições por segundo indefinidamente.

A variação comum é o *leaky bucket* espelhado: em vez de tokens que entram, a fila esvazia em ritmo constante — útil quando você quer **suavizar** o tráfego que chega ao sistema de fundo (o que entra no bucket pode sair em rajada; no leaky, o que sai é sempre constante). Ferramentas como o NGINX `limit_req` implementam essa suavização com o parâmetro `burst` + `nodelay`, e é por isso que a configuração padrão dele se comporta como token bucket na entrada e como fila no processamento.

## Janela fixa, janela deslizante e o problema da borda

O algoritmo concorrente clássico é a **janela fixa**: conte requisições por intervalo de tempo (a janela) e rejeite quando passar do teto. É barato — um contador por chave por janela — mas tem um defeito famoso: a **borda da janela**. Num limite de 100/minuto, um cliente pode disparar 100 requisições nos últimos 5 segundos de um minuto e mais 100 nos primeiros 5 segundos do seguinte. Nenhuma janela individual foi violada, mas em 10 segundos você recebeu 200 requisições — o dobro do ritmo contratado.

A **janela deslizante** (sliding window) elimina a borda ao medir o intervalo "rolante" em vez de intervalos fixos. Duas implementações dominam:

- **Sliding window log:** guarde o timestamp de cada requisição da chave e conte quantas caem dentro do último minuto. Preciso e caro em memória para taxas altas.
- **Sliding window counter (a pragmática):** interpole o contador da janela anterior com o da atual, ponderado pelo tempo decorrido. É a aproximação canônica dos padrões de implementação com Redis — custo O(1), erro pequeno e aceitável para rate limit.

Quando usar cada um? Janela fixa serve para cotas grosseiras (consumo diário de um plano). Token bucket serve para proteger endpoints de rajada (login, webhooks). Janela deslizante serve para contratos de API públicos, onde o número do limite precisa ser honesto na prática, não só na média.

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-11-14-rate-limiting-em-apis-token-bucket-e-janela-deslizante-2.jpg" alt="Sequência de 429 com Retry-After e headers X-RateLimit entre cliente e API, com espera e nova tentativa bem-sucedida" loading="lazy">
<figcaption>O 429 com Retry-After transforma um erro em contrato: o cliente sabe quando voltar sem piorar a sobrecarga.</figcaption>
</figure>

## Onde aplicar: gateway, aplicação ou banco de dados

A posição do limite na arquitetura importa tanto quanto o algoritmo. As três posições clássicas:

- **No gateway/edge (NGINX, Cloudflare, Kong, API Gateway):** o limite mais barato de todos — requisições rejeitadas nunca chegam a consumir CPU da aplicação. É onde você aplica limites por IP, por token e por rota. Dois riscos: atrás de um load balancer, o IP que o gateway vê pode ser o do proxy (solucione com `X-Forwarded-For` confiável) e limites por IP punem usuários corporativos atrás de NAT.
- **Na aplicação (middleware):** mais caro, porém mais rico — você limita por usuário, por plano, por custo estimado da requisição. Bibliotecas como `slowapi` (FastAPI) e `express-rate-limit` cobrem o caso simples; para estado compartilhado entre instâncias, o contador precisa morar fora do processo (Redis é o padrão).
- **No banco/filas:** o último bastião. Ferramentas como ProxySQL ou mesmo `max_connections` limitam o dano, mas a essa altura a requisição já gastou CPU. Use como proteção secundária, nunca como política primária.

A regra prática: **limite grosso no gateway, limite fino na aplicação**. O gateway rejeita o evidente por IP/rota; a aplicação decide por identidade e valor de negócio. Guardar estado de rate limit no Redis com TTL curto é o desenho mais comum: a chave expira sozinha, nenhuma limpeza extra é necessária.

## 429, Retry-After e os headers que seu cliente precisa

Rejeitar é a metade fácil; comunicar a rejeição é onde a maioria das APIs falha. Um `429` nu deixa o cliente tentando no escuro, e cada tentativa às cegas agrava exatamente o problema que o limite queria resolver. A resposta precisa dizer três coisas:

- **Quando voltar:** o header `Retry-After` (em segundos ou data HTTP). É a informação mais valiosa que você pode mandar.
- **Quanto resta:** headers do tipo `X-RateLimit-Limit`, `X-RateLimit-Remaining` e `X-RateLimit-Reset` (ou o padrão mais novo em padronização no IETF, `RateLimit-Limit`/`RateLimit-Remaining`/`RateLimit-Reset`). O cliente que enxerga o saldo se auto-regula antes de bater no teto.
- **Por que parou:** um corpo de erro com código legível (`rate_limit_exceeded`) evita que o cliente trate 429 como bug.

RFC 6585 definiu o 429 exatamente para esse caso, e a recomendação é antiga: incluir `Retry-After`. No gateway, configure o NGINX para propagar headers de limite ou adicione-os no middleware — é uma linha de configuração que economiza dezenas de tickets de suporte.

## Como o cliente deve reagir (e como isso conecta com retries)

Para quem consome a API, a regra de ouro é: **429 é um pedido de espera, não um erro para ignorar nem para retry imediato**. O cliente respeitoso lê `Retry-After` e agenda a tentativa; se o header não vier, aplica backoff exponencial com jitter — mesmo mecanismo do post anterior sobre idempotência e retries, e as duas técnicas se completam: backoff define *quando* tentar de novo, rate limiting diz *quanto* se pode tentar.

Um detalhe que separa clientes amadores dos profissionais: antes de apostar em retry, reduza a **taxa de chegada**. Debounce de eventos de UI, paginação real em vez de loop client-side, e batch quando a API oferece. O melhor rate limit é o que você nunca encosta porque o cliente pediu menos.

## Erros comuns de rate limiting

- **Limite único para todo mundo:** um teto só por IP quebra atrás de NAT/CGNAT e é furado por quem troca de IP. Limite por identidade autenticada sempre que existir.
- **429 sem `Retry-After`:** o cliente voltou imediatamente e o limite virou amortecedor de erros em vez de proteção.
- **Contador em memória local com múltiplas instâncias:** cada instância tem seu próprio teto; o limite efetivo vira N × limite. Estado compartilhado (Redis) resolve.
- **Janela fixa em contrato público:** o spike na borda descrito acima quebra a promessa sem violar o número. Prefira sliding counter quando o limite é promessa.
- **Silenciar o motivo:** 429 com corpo vazio vira falso positivo de bug no monitoramento do cliente. Um JSON com código e mensagem custa nada e poupa horas.
- **Não tratar limite como SLO:** monitore a taxa de 429 por chave e por rota. Pico súbito de 429 é sinal de cliente mal comportado — ou de limite mal calibrado. Os dois merecem alerta.

## Conclusão

Rate limiting bem-feito é um contrato em três camadas: um algoritmo que faz sentido para o seu padrão de tráfego (token bucket para rajadas, janela deslizante para promessas honestas), uma posição arquitetural que rejeita barato antes de caro (gateway em cima, aplicação para o fino) e respostas que dão ao cliente tudo que ele precisa para se auto-reguluar (429, `Retry-After` e headers de saldo). Configure isso uma vez e o pico de madrugada que abria este post vira um gráfico bonito de 429s no seu painel — não um incidente.

## Fontes

- [RFC 6585: Additional HTTP Status Codes](https://datatracker.ietf.org/doc/html/rfc6585) - Define o 429 (Too Many Requests) e recomenda o header Retry-After.
- [MDN Web Docs: 429 Too Many Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429) - Semântica do status e uso de Retry-After.
- [NGINX Blog: Rate Limiting with NGINX and NGINX Plus](https://blog.nginx.org/blog/rate-limiting-nginx) - Implementação de referência de limit_req, burst e nodelay.
- [Stripe Docs: Rate limits](https://docs.stripe.com/rate-limits) - Exemplo real de política de limites e orientação a clientes de API.
- [GitHub REST API: Rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits) - Headers X-RateLimit e comportamento esperado do cliente.
- [IETF draft-ietf-httpapi-ratelimit-headers](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/) - Padronização em curso dos headers RateLimit-*.
