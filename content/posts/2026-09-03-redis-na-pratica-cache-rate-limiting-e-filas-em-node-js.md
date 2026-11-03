---
title: "Redis na prática: cache, rate limiting e filas em Node.js"
date: "2026-09-03"
category: "tutorial"
tags: ["redis", "cache", "backend"]
excerpt: "Redis na prática: cache, rate limiting e filas em Node.js."
share_hook: "Cache, rate limiting com janela deslizante, filas com BullMQ e pub/sub — tudo num Redis que roda em Docker."
lang: "pt"
---

### Por que você deve se preocupar agora  

Imagine que seu e-commerce precisa manter o estoque sincronizado com um marketplace. A cada venda o estoque tem que ser atualizado em milissegundos, senão o cliente compra um produto que já acabou e a reputação da loja despenca. Em um cenário assim, a API do marketplace pode começar a responder com erros de *429 Too Many Requests* e, ao mesmo tempo, o banco de dados fica sobrecarregado com consultas repetidas ao mesmo registro de produto. A solução acaba sendo colocar uma camada de Redis entre a aplicação e o banco, usando o Redis não só como cache, mas também como limitador de taxa e como broker de filas.  

Se você já passou por uma situação parecida – ou ainda não, mas sabe que pode acontecer – este artigo mostra, passo a passo, como montar essas três funções essenciais com Node.js, Docker e poucas linhas de código.


---

## 1. Preparando o ambiente com Docker  

Começar com o Redis dentro de um container facilita a replicação do ambiente em desenvolvimento, teste e produção. O comando abaixo cria um `docker-compose.yml` bem enxuto:

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: redis-dev
    ports:
      - "6379:6379"
    restart: unless-stopped
    volumes:
      - redis-data:/data
    # Cache nao pode ter memoria ilimitada: quando ela acaba, o Redis para
    # de responder em vez de continuar despejando. maxmemory + politica de
    # despejo e o que mantem o servico no ar sob pressao.
    command:
      - redis-server
      - --save
      - "60"
      - "1"
      - --loglevel
      - warning
      - --maxmemory
      - 256mb
      - --maxmemory-policy
      - allkeys-lru

volumes:
  redis-data:
```

Execute `docker compose up -d` e o Redis já está pronto para aceitar conexões na porta padrão. Essa configuração simples funciona bem para sincronizar catálogo e estoque entre sistemas, garantindo que a latência seja previsível.

> **Dica:** mantenha a mesma versão da imagem em todos os ambientes. O `redis:7-alpine` tem o menor tamanho e já inclui os módulos de *streams* e *Lua* que vamos usar mais adiante.


---

## 2. Padrões de cache no Node.js  

### 2.1. Conceitos rápidos  

* **Write‑through** – toda escrita no banco também atualiza o cache.  
* **Cache‑aside** – a aplicação lê do cache; se o dado não está lá, consulta o banco, grava no cache e devolve ao cliente.

No meu dia a dia, o padrão cache‑aside tem sido o mais flexível, principalmente quando a carga de escrita é menor que a de leitura, como no caso da sincronização de estoque.


<figure>
  <img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-03-redis-na-pratica-cache-rate-limiting-e-filas-em-node-js.jpg" alt="Cache de mapeamento direto: o conceito que fundamenta o Redis." loading="lazy" />
  <figcaption>
    Cache de mapeamento direto: o conceito que fundamenta o Redis. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3ADirect-Mapped_Cache.png">Direct-Mapped Cache.png</a> por Snehalc —
    <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a> · via Wikimedia Commons
  </figcaption>
</figure>

### 2.2. Implementando cache‑aside com `redis` (v4)

Instale o cliente oficial:

```bash
npm i redis@4
```

Crie um módulo `redisClient.js`:

```js
import { createClient } from 'redis';

const client = createClient({
  url: 'redis://localhost:6379',
});

client.on('error', err => console.error('Redis error', err));

await client.connect();

export default client;
```

Agora, um exemplo de função que busca um produto no PostgreSQL (via `pg`) e usa cache‑aside:

```js
import client from './redisClient.js';
import { query } from './db.js'; // wrapper do pg

export async function getProduct(id) {
  const cacheKey = `product:${id}`;

  // tenta ler do Redis
  const cached = await client.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // se não encontrou, busca no banco
  const { rows } = await query('SELECT * FROM products WHERE id = $1', [id]);
  const product = rows[0];

  // grava no cache por 10 minutos
  await client.setEx(cacheKey, 600, JSON.stringify(product));

  return product;
}
```

Esse padrão evita consultas repetidas ao mesmo registro de produto quando o preço precisa ser consultado rapidamente em operações frequentes.

### 2.3. Write‑through simplificado

Quando a aplicação cria ou atualiza um produto, basta chamar a mesma função de cache:

```js
export async function upsertProduct(product) {
  const { rows } = await query(
    `INSERT INTO products (id, name, price, stock)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       price = EXCLUDED.price,
       stock = EXCLUDED.stock
     RETURNING *`,
    [product.id, product.name, product.price, product.stock]
  );

  const saved = rows[0];
  const cacheKey = `product:${saved.id}`;

  // atualiza o cache imediatamente
  await client.setEx(cacheKey, 600, JSON.stringify(saved));

  return saved;
}
```

Assim, o cache nunca fica desatualizado, mesmo que a base de dados seja alterada por outro processo.


---

## 3. Rate limiting com janela deslizante  

### 3.1. Por que não usar apenas `express-rate-limit`  

Muitos projetos dependem de middleware que guarda contadores em memória. Isso funciona em um único servidor, mas falha assim que você escala para múltiplas instâncias – cada nó tem sua própria contagem. O Redis, por ser centralizado, resolve esse problema.

### 3.2. Algoritmo de janela deslizante em Lua  

O algoritmo mais preciso para controle de taxa é o *sliding window log*. Ele grava timestamps de requisições em uma lista e remove os que já “saíram” da janela. O código Lua abaixo já está pronto para ser usado como script Redis:

```lua
-- KEYS[1] = chave do usuário (ex.: "rl:12345")
-- ARGV[1] = limite de requisições (ex.: 100)
-- ARGV[2] = janela em milissegundos (ex.: 60000)

local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = redis.call("TIME")
local timestamp = now[1] * 1000 + math.floor(now[2] / 1000)

-- remove entradas antigas
redis.call("ZREMRANGEBYSCORE", key, 0, timestamp - window)

-- conta quantas ainda restam
local count = redis.call("ZCARD", key)

if count >= limit then
  return 0
else
  -- O membro precisa ser unico dentro do ZSET. Usar so o timestamp como
  -- member faz duas requisicoes no mesmo milissegundo colidirem: o segundo
  -- ZADD sobrescreve o primeiro e o contador conta 1 onde houve 2, o que
  -- abre brecha para estourar o limite com um burst.
  local seq = redis.call("INCR", key .. ":seq")
  redis.call("PEXPIRE", key .. ":seq", window)
  redis.call("ZADD", key, timestamp, timestamp .. "-" .. seq)
  redis.call("PEXPIRE", key, window)
  return 1
end
```

### 3.3. Integrando com Node.js  

```js
import client from './redisClient.js';
import fs from 'fs';
import path from 'path';

// carrega o script apenas uma vez
const script = await fs.promises.readFile(
  path.resolve('scripts/slidingWindow.lua'),
  'utf8'
);
const sha = await client.scriptLoad(script);

/**
 * Verifica se o IP pode fazer a requisição.
 * @param {string} ip
 * @param {number} limit
 * @param {number} windowMs
 * @returns {Promise<boolean>}
 */
export async function canProceed(ip, limit = 100, windowMs = 60_000) {
  const key = `rl:${ip}`;
  const result = await client.evalSha(
    sha,
    {
      keys: [key],
      arguments: [limit, windowMs],
    }
  );
  return result === 1;
}
```

E no middleware Express:

```js
// ATENÇÃO: sem isso, req.ip é o IP do proxy/load balancer, e não o do
// cliente. O efeito é todo mundo do mundo caindo no mesmo balde de
// limite: um usuário legítimo consumindo 100 req deixa todo mundo
// bloqueado. Confie apenas nos saltos que voce controla.
app.set('trust proxy', 1);

app.use(async (req, res, next) => {
  const ip = req.ip;
  if (await canProceed(ip)) {
    return next();
  }
  res.status(429).json({ error: 'Too many requests' });
});
```

Detalhe que costuma passar batido: o script Lua usa `redis.call("TIME")`, ou seja, o **relógio do Redis**, e nao o da aplicacao. E o que voce quer aqui — se o relógio da sua máquina estivesse adiantado, ele contaria entradas que ainda nao sairam da janela. Usar o tempo do servidor de dados tambem evita um segundo problema: quando voce roda o Redis em varios nos com relogios diferentes, todos precisam concordar sobre "agora".

Esse limitador ajuda a impedir abusos em APIs públicas, mantendo a latência estável mesmo sob pico de tráfego.


---

## 4. Filas com BullMQ  

### 4.1. Quando usar filas  

- Processamento assíncrono de imagens, PDFs ou vídeos.  
- Envio de e‑mails em lote.  
- Integrações que dependem de APIs de terceiros com limites de taxa.

Ao orquestrar chamadas a múltiplos provedores, respeitar cooldowns é fundamental. BullMQ foi a escolha natural porque já funciona sobre Redis e oferece recursos avançados como retries e rate limiting por fila.

### 4.2. Instalando BullMQ

```bash
npm i bullmq
```

### 4.3. Criando uma fila de notificações

```js
import { Queue, Worker, QueueEvents } from 'bullmq';
import client from './redisClient.js';

const notificationQueue = new Queue('notifications', {
  connection: client,
});

export async function enqueueEmail(to, subject, body) {
  await notificationQueue.add('send-email', { to, subject, body }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
}
```

### 4.4. Consumidor (worker)

```js
const worker = new Worker(
  'notifications',
  async job => {
    if (job.name === 'send-email') {
      const { to, subject, body } = job.data;
      // aqui chamaria o serviço de e‑mail real
      console.log(`Enviando e‑mail para ${to}`);
    }
  },
  { connection: client }
);

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} falhou:`, err);
});
```

### 4.5. Observando eventos

```js
const events = new QueueEvents('notifications', { connection: client });
events.on('completed', ({ jobId }) => {
  console.log(`Job ${jobId} concluído`);
});
```

Com BullMQ é possível desacoplar a geração de relatórios pesados. Cada relatório é colocado na fila, processado em segundo plano e, ao final, o usuário pode ser notificado.


---

## 5. Pub/Sub para eventos em tempo real  

O Redis oferece o padrão *publish/subscribe* nativo, útil para notificações leves ou para sincronizar estado entre instâncias. Um caso típico no varejo é avisar ao front‑end que o estoque de um produto mudou.

### 5.1. Publicando um evento

```js
export async function publishStockChange(productId, newStock) {
  const channel = `stock:${productId}`;
  await client.publish(channel, JSON.stringify({ productId, newStock }));
}
```

### 5.2. Consumindo em outro processo

```js
const subscriber = client.duplicate();
await subscriber.connect();

await subscriber.subscribe('stock:*', (message, channel) => {
  const data = JSON.parse(message);
  console.log(`Estoque atualizado: ${data.productId} → ${data.newStock}`);
  // aqui poderia invalidar o cache ou atualizar UI via WebSocket
});
```

Esse fluxo permite atualizar a interface em tempo real quando o estoque é alterado por uma venda.


---

## 6. Produção: modo clusterizado  

Em ambientes de produção, o Redis *standalone* pode se tornar um ponto único de falha. O modo **cluster** distribui slots de chave entre múltiplos nós, permitindo escalabilidade horizontal.

Vale ser preciso sobre o que ele entrega, porque é fácil prometer demais aqui: **cluster por si só não dá tolerância a falhas.** O que dá é a distribuição de slots e a possibilidade de cresc horizontalmente. A tolerância a falhas vem de outro recurso, os *replicas*, e o exemplo abaixo usa `--cluster-replicas 0` justamente porque é o mais simples de montar localmente. Com zero réplicas, se um dos três nós morrer, os slots dele ficam indisponíveis — não há replicação para onde ir.

Quando quiser realmente sobreviver à queda de um nó, o caminho é:

```bash
# 3 masters + 1 replica cada = 6 nós, cada master com uma cópia
docker exec -it redis-node-1 redis-cli --cluster create \
  172.28.0.11:7000 172.28.0.12:7001 172.28.0.13:7002 \
  172.28.0.14:7003 172.28.0.15:7004 172.28.0.16:7005 \
  --cluster-replicas 1
```

Dois cuidados que só aparecem quando você já está em produção:

- **`--cluster-replicas 1` exige pelo menos 6 nós.** O Redis recusa a criação do cluster se não houver nós suficientes para distribuir masters e réplicas.
- **Replicação é assíncrona.** Um replica pode estar atrás do master quando a falha acontece, e você perde as escritas que não chegaram a tempo. Para cache, isso costuma ser aceitável. Para fila BullMQ, avalie com mais cuidado: job confirmado e não replicado é job perdido.

### 6.1. Configurando um cluster local com Docker Compose

```yaml
services:
  redis-node-1:
    image: redis:7-alpine
    command: ["redis-server", "--cluster-enabled", "yes", "--cluster-config-file", "nodes.conf", "--port", "7000"]
    ports: ["7000:7000"]
    volumes:
      - node1-data:/data
    networks:
      redis-net:
        ipv4_address: 172.28.0.11

  redis-node-2:
    image: redis:7-alpine
    command: ["redis-server", "--cluster-enabled", "yes", "--cluster-config-file", "nodes.conf", "--port", "7001"]
    ports: ["7001:7001"]
    volumes:
      - node2-data:/data
    networks:
      redis-net:
        ipv4_address: 172.28.0.12

  redis-node-3:
    image: redis:7-alpine
    command: ["redis-server", "--cluster-enabled", "yes", "--cluster-config-file", "nodes.conf", "--port", "7002"]
    ports: ["7002:7002"]
    volumes:
      - node3-data:/data
    networks:
      redis-net:
        ipv4_address: 172.28.0.13

networks:
  redis-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16

volumes:
  node1-data:
  node2-data:
  node3-data:
```

Repare no bloco `networks`. O `redis-cli --cluster create` precisa de endereços **fixos**, e o Compose não os garante sozinho: a sub-rede do Docker é atribuída dinamicamente e muda de máquina para máquina. Sem o `ipv4_address` explícito, o comando abaixo funciona na sua máquina e falha na do colega — que é a definição de "funciona na minha máquina".

Depois de subir os containers, crie o cluster:

```bash
docker exec -it redis-node-1 redis-cli --cluster create \
  172.28.0.11:7000 172.28.0.12:7001 172.28.0.13:7002 \
  --cluster-replicas 0
```

### 6.2. Conectando o cliente Node.js ao cluster

```js
import { createCluster } from 'redis';

const cluster = createCluster({
  rootNodes: [
    { url: 'redis://localhost:7000' },
    { url: 'redis://localhost:7001' },
    { url: 'redis://localhost:7002' },
  ],
});

await cluster.connect();

export default cluster;
```

A partir daí, todas as chamadas de cache, rate limiting e filas funcionam de forma transparente, pois o cliente roteia a chave para o nó correto.


---

## 7. Conclusão  

Implementar cache, rate limiting e filas com Redis não é apenas “coisa de grande empresa”. Com esses padrões é possível reduzir a latência de consultas, evitar bloqueios por limites de API e garantir que tarefas críticas sejam processadas mesmo em picos de carga.  

A combinação de Docker, o cliente oficial `redis` e bibliotecas como BullMQ oferece um caminho rápido e confiável.

## Próximos passos

O que este post monta já serve para produção de tráfego baixo. Os furos conhecidos, na ordem em que eu os enfrentaria:

1. **Cache stampede** — o padrão cache-aside tem uma corrida: quando uma chave expira, todas as requisições simultâneas caem no banco ao mesmo tempo. [`ttl-lru`](https://github.com/luin/redis-lru) (precisa de Redis ≥ 6.2) resolve com lock de stampede, ou é o padrão simples de travar a reconstrução por chave. Vale medir antes de otimizar: o sintoma é latência em pico, não erro.
2. **Invalidação** — o TTL de 10 minutos do exemplo é um chute. Quando o dado muda por evento (o fluxo de estoque deste post), o certo é invalidar na escrita, e o Pub/Sub da seção 5 é o gancho natural para isso.
3. **Rate limit distribuído de verdade** — o script Lua assume um Redis só. Com cluster, a chave precisa cair num slot só (use hashtags `{user123}`, senão o *ZADD* e o *ZREMRANGEBYSCORE* em nós diferentes quebram o algoritmo).
4. **Observabilidade** — `SLOWLOG GET`, `INFO memory` e `LATENCY DOCTOR` dizem por que o Redis ficou lento antes de você adivinhar.
5. **Autenticação e TLS** — o compose local abre a porta 6379 no host sem senha. Em qualquer ambiente compartilhado, `requirepass` + `redis://:senha@host` não são opcionais.

Além do Redis: **rate limiting** em rede real pede atenção a chave por usuário e não só por IP, senão uma rede NAT inteiro (escritório, escola, carrier) compartilha o mesmo balde.


---

## Fontes  

- [Redis Documentation – Clustering](https://redis.io/docs/manual/scaling/)  
- [BullMQ – GitHub Repository](https://github.com/taskforcesh/bullmq)  
- [Node‑Redis (redis) v4 – API Reference](https://github.com/redis/node-redis)  
- [Rate limiting with Redis and Lua – blog post by Upstash](https://upstash.com/blog/redis-rate-limiting)  
- [Express Rate Limit – npm package (conceptual comparison)](https://www.npmjs.com/package/express-rate-limit)

## 📸 Crédito da imagem de capa
- **Imagem:** [Cache Memory-jurvetson.jpg](https://commons.wikimedia.org/wiki/File%3ACache_Memory-jurvetson.jpg)
- **Autor(a):** Steve Jurvetson from Menlo Park, USA
- **Licença:** [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) · via Wikimedia Commons
