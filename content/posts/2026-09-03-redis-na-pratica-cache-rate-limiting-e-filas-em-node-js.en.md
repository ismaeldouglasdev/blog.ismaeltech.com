---
title: "Redis in Practice: Caching, Rate Limiting & Queues in Node.js"
date: "2026-09-03"
category: "tutorial"
tags: ["redis", "cache", "backend"]
excerpt: "Redis in practice: caching, rate limiting and queues in Node.js."
share_hook: "Cache, sliding-window rate limiting, BullMQ queues and pub/sub in one Redis."
cover:
  image: "/covers/2026-09-03-redis-na-pratica-cache-rate-limiting-e-filas-em-node-js.jpg"
comments: true
translationKey: "2026-09-03-redis-na-pratica-cache-rate-limiting-e-filas-em-node-js"
---

### Why you should care right now  

Imagine an e‑commerce integrating a POS with a marketplace. With each sale, inventory must be updated within milliseconds, otherwise a customer ends up buying a product that’s already out of stock. During testing, the marketplace API started returning *429 Too Many Requests* errors and the database became overloaded with repeated queries. The solution was to add a Redis layer between the application and the database, using it as a cache, a rate limiter, and a queue broker.  

If you’ve already faced a similar situation – or haven’t yet, but know it could happen – this article shows, step by step, how to build these three essential functions with Node.js, Docker, and just a few lines of code.

## 1. Preparing the environment with Docker  

Starting with Redis inside a container makes it easier to replicate the environment in development, testing, and production. The command below creates a lean `docker-compose.yml`:

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
    # A cache cannot have unlimited memory: once it runs out, Redis stops
    # answering instead of evicting. maxmemory plus an eviction policy is
    # what keeps the service up under pressure.
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

Run `docker compose up -d` and Redis is ready to accept connections on the default port. > **Tip:** keep the same image version across all environments. The `redis:7-alpine` image is the smallest and already includes the *streams* and *Lua* modules that we will use later.

## 2. Cache Patterns in Node.js  

### 2.1. Quick Concepts  

* **Write‑through** – every write to the database also updates the cache.  
* **Cache‑aside** – the application reads from the cache; if the data isn’t there, it queries the database, writes to the cache, and returns it to the client.


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-03-redis-na-pratica-cache-rate-limiting-e-filas-em-node-js-1.jpg" alt="Redis in Practice: Caching, Rate Limiting &amp; Queues in Node.js" loading="lazy">
<figcaption>Redis "expire" command sets a timeout in seconds on key. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3ARedis%27s_%22EXPIRE%22_%2818563947238%29.jpg">Redis&#x27;s &quot;EXPIRE&quot; (18563947238).jpg</a> por Exey Panteleev from Moscow, Russia — <a href="https://creativecommons.org/licenses/by/2.0">CC BY 2.0</a> · via Wikimedia Commons</figcaption>
</figure>
In my day‑to‑day work, the cache‑aside pattern has been the most flexible, especially when the write load is lower than the read load, such as in inventory synchronization.


<figure>
  <img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-03-redis-na-pratica-cache-rate-limiting-e-filas-em-node-js.jpg" alt="Direct-mapped cache: the concept that underpins Redis." loading="lazy" />
  <figcaption>
    Direct-mapped cache: the concept that underpins Redis. — Image: <a href="https://commons.wikimedia.org/wiki/File%3ADirect-Mapped_Cache.png">Direct-Mapped Cache.png</a> by Snehalc —
    <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a> · via Wikimedia Commons
  </figcaption>
</figure>

### 2.2. Implementing cache‑aside with `redis` (v4)

Install the official client:

```bash
npm i redis@4
```

Create a `redisClient.js` module:

```js
import { createClient } from 'redis';

const client = createClient({
  url: 'redis://localhost:6379',
});

client.on('error', err => console.error('Redis error', err));

await client.connect();

export default client;
```

Now, an example function that fetches a product from PostgreSQL (via `pg`) and uses cache‑aside:

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

### 2.3. Simplified Write‑through

When the application creates or updates a product, just call the same cache function:

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

---
Thus, the cache never becomes outdated, even if the database is altered by another process.
---

## 3. Rate limiting with sliding window  

### 3.1. Why not just use `express-rate-limit`  

Many projects rely on middleware that stores counters in memory. This works on a single server, but it breaks as soon as you scale to multiple instances—each node has its own count. Redis, being centralized, solves this problem.

### 3.2. Sliding window algorithm in Lua  

The most precise algorithm for rate control is the *sliding window log*. It records request timestamps in a list and removes those that have already “left” the window. The Lua code below is ready to be used as a Redis script:

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
  -- The member must be unique within the ZSET. Using the timestamp alone as
  -- the member makes two requests in the same millisecond collide: the second
  -- ZADD overwrites the first and the counter sees 1 where there were 2,
  -- which opens a hole for bursting past the limit.
  local seq = redis.call("INCR", key .. ":seq")
  redis.call("PEXPIRE", key .. ":seq", window)
  redis.call("ZADD", key, timestamp, timestamp .. "-" .. seq)
  redis.call("PEXPIRE", key, window)
  return 1
end
```

### 3.3. Integrating with Node.js  

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

And in the Express middleware:

```js
// Trust only the hops you actually control.
app.set('trust proxy', 1);

app.use(async (req, res, next) => {
  // IMPORTANT: without this, req.ip is the proxy/load balancer's IP, not the
  // client's. The effect is the whole world landing in the same rate-limit
  // bucket: one legitimate user spending 100 requests locks everyone out.
  const ip = req.ip;
  if (await canProceed(ip)) {
    return next();
  }
  res.status(429).json({ error: 'Too many requests' });
});
```

A rate limiter is useful to prevent enrichment APIs from being hammered by bots, keeping latency stable even under traffic spikes.

## 4. Queues with BullMQ  

### 4.1. When to use queues  

- Asynchronous processing of images, PDFs, or videos.  
- Batch email sending.  
- Integrations that depend on third‑party APIs with rate limits.

When orchestrating calls to multiple providers with cooldowns, BullMQ is a natural choice because it runs on Redis and offers retries and rate limiting per queue.

### 4.2. Installing BullMQ

```bash
npm i bullmq
```

### 4.3. Creating a notification queue

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

### 4.4. Consumer (worker)

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

### 4.5. Observing events

```js
const events = new QueueEvents('notifications', { connection: client });
events.on('completed', ({ jobId }) => {
  console.log(`Job ${jobId} concluído`);
});
```

With BullMQ it’s easy to decouple heavy report generation from the main application. Each report goes to a queue, is processed in the background, and the user receives a notification when ready.

## 5. Pub/Sub for real‑time events  

Redis provides a native *publish/subscribe* pattern, useful for lightweight notifications or for synchronizing state across instances. A typical retail scenario is notifying the front‑end that a product’s stock has changed.

### 5.1. Publishing an event

```js
export async function publishStockChange(productId, newStock) {
  const channel = `stock:${productId}`;
  await client.publish(channel, JSON.stringify({ productId, newStock }));
}
```

### 5.2. Consuming in another process

```js
const subscriber = client.duplicate();
await subscriber.connect();

await subscriber.subscribe('stock:*', (message, channel) => {
  const data = JSON.parse(message);
  console.log(`Estoque atualizado: ${data.productId} → ${data.newStock}`);
  // here you could invalidate the cache or update the UI via WebSocket
});
```

This flow allows the frontend to be updated in real time when stock changes.

## 6. Production: clustered mode  

In production environments, a standalone Redis can become a single point of failure. **Cluster** mode distributes key slots across multiple nodes, enabling horizontal scalability.

It is worth being precise about what it delivers, because it is easy to over-promise here: **cluster on its own does not give fault tolerance.** What it gives is slot distribution and the ability to grow horizontally. Fault tolerance comes from a different feature, replicas, and the example below uses `--cluster-replicas 0` precisely because it is the simplest to set up locally. With zero replicas, if one of the three nodes dies, its slots become unavailable — there is no copy to fail over to.

When you actually want to survive losing a node:

```bash
# 3 masters + 1 replica each = 6 nodes, every master with a copy
docker exec -it redis-node-1 redis-cli --cluster create \
  172.28.0.11:7000 172.28.0.12:7001 172.28.0.13:7002 \
  172.28.0.14:7003 172.28.0.15:7004 172.28.0.16:7005 \
  --cluster-replicas 1
```

Two caveats that only show up once you are in production:

- **`--cluster-replicas 1` needs at least 6 nodes.** Redis refuses to create the cluster without enough nodes to distribute masters and replicas.
- **Replication is asynchronous.** A replica can lag behind its master when the failure hits, and you lose the writes that never made it across. For a cache that is usually fine. For a BullMQ queue, weigh it more carefully: a job acknowledged but not replicated is a job lost.
### 6.1. Setting up a local cluster with Docker Compose

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

After bringing up the containers, create the cluster:

```bash
docker exec -it redis-node-1 redis-cli --cluster create \
  172.28.0.11:7000 172.28.0.12:7001 172.28.0.13:7002 \
  --cluster-replicas 0
```

Look at the `networks` block above. `redis-cli --cluster create` needs **fixed** addresses, and Compose does not provide them on its own: the Docker subnet is assigned dynamically and changes from machine to machine. Without the explicit `ipv4_address`, the command works on your machine and fails on your colleague's — which is the definition of "works on my machine".

### 6.2. Connecting a Node.js client to the cluster

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

From that point on, all cache calls, rate limiting, and queues operate transparently, as the client routes each key to the appropriate node.

## 7. Conclusion  

Implementing caching, rate limiting, and queues with Redis is not just “big‑company stuff”. These patterns can cut query latency significantly, avoid blocks due to API limits, and ensure that critical tasks are processed even under load spikes.  

The combination of Docker, the official `redis` client, and libraries such as BullMQ provides a fast and reliable path.

## Next steps

What this post builds is already fine for low-traffic production. The known gaps, in the order I would face them:

1. **Cache stampede** — cache-aside has a race: when a key expires, every simultaneous request falls through to the database at once. [`ttl-lru`](https://github.com/luin/redis-lru) (needs Redis >= 6.2) fixes it with a stampede lock, or the simple pattern of guarding the rebuild per key. Measure before optimizing: the symptom is latency under spike, not errors.
2. **Invalidation** — the 10-minute TTL in the example is a guess. When data changes by event (the inventory flow in this post), the right move is to invalidate on write, and the Pub/Sub from section 5 is the natural hook.
3. **Truly distributed rate limiting** — the Lua script assumes a single Redis. With a cluster, the key has to land in a single slot (use hashtags `{user123}`, otherwise the `ZADD` and `ZREMRANGEBYSCORE` on different nodes break the algorithm).
4. **Observability** — `SLOWLOG GET`, `INFO memory` and `LATENCY DOCTOR` tell you why Redis got slow before you guess.
5. **Auth and TLS** — the local compose exposes port 6379 on the host with no password. In any shared environment, `requirepass` plus `redis://:password@host` are not optional.

Beyond Redis: **rate limiting** on a real network needs a key per user rather than per IP, otherwise an entire NAT (an office, a school, a carrier) shares one bucket.

## Sources  

- [Redis Documentation – Clustering](https://redis.io/docs/manual/scaling/)  
- [BullMQ – GitHub Repository](https://github.com/taskforcesh/bullmq)  
- [Node‑Redis (redis) v4 – API Reference](https://github.com/redis/node-redis)  
- [Rate limiting with Redis and Lua – blog post by Upstash](https://upstash.com/blog/redis-rate-limiting)  
- [Express Rate Limit – npm package (conceptual comparison)](https://www.npmjs.com/package/express-rate-limit)
## 📸 Cover image credit
- **Image:** [Cache Memory-jurvetson.jpg](https://commons.wikimedia.org/wiki/File%3ACache_Memory-jurvetson.jpg)
- **Author:** Steve Jurvetson from Menlo Park, USA
- **License:** [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) · via Wikimedia Commons
