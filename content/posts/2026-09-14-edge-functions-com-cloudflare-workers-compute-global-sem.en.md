---
title: "Edge Functions with Cloudflare Workers: Global Serverless Computing"
date: "2026-09-14"
category: "tutorial"
tags: ["edge", "cloudflare", "serverless", "workers"]
excerpt: "Edge Functions with Cloudflare Workers: global serverless computing."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-09-14-edge-functions-com-cloudflare-workers-compute-global-sem.jpg"
comments: true
translationKey: "2026-09-14-edge-functions-com-cloudflare-workers-compute-global-sem"
---


The web application architecture has undergone a quiet transformation in recent years. The traditional single-server model, where you maintain a machine responding to requests in a specific geographic location, is giving way to something fundamentally different: code that runs simultaneously in hundreds of points of presence around the world, just milliseconds away from any user. This change is not just evolutionary; it's a redefinition of what it means to "distribute" an application.

Cloudflare Workers represents one of the most mature implementations of this vision. Launched in 2017, the service allows you to run JavaScript, TypeScript, and Rust code on Cloudflare edge locations, without the need to manage servers, configure load balancers, or decide which region to deploy to. Workers runs where the user is, and this simple geographic change unlocks a range of architectural possibilities that were impractical or economically prohibitive with traditional infrastructure.

## The Edge Model and Its Fundamental Differences

To understand why edge functions represent a significant shift, we first need to examine the traditional cloud model and its inherent limitations. When you deploy an application on a conventional cloud provider, some fundamental choices need to be made: which regions the servers will be in, how traffic will be distributed between them, and what happens when latency between user and server affects the experience.

Most modern web applications follow a pattern that seems reasonable on paper: the user makes a request, it travels through the internet to a data center, gets processed by a server that may be thousands of kilometers away, and then the response makes its way back. For users near the server, this latency is imperceptible. For those on the other side of the world, each request adds tens or hundreds of milliseconds to response time, creating a degraded experience that directly impacts business metrics like conversion rate and engagement.

The first attempt to solve this problem was the traditional CDN, which caches static content at edge locations and delivers it to users from the closest point. It works well for images, CSS, JavaScript, and other immutable assets, but it doesn't solve the problem of dynamic requests that need processing. If your API endpoint checks authentication, queries a custom database, or executes business logic, you still need a centralized server processing those requests.

Edge functions tackle precisely this limitation. Instead of just caching content, the edge location can execute arbitrary code before deciding whether the request needs to go to the origin server, whether it can be served directly from cache, or whether it can be transformed in some way that benefits the end user. The result is a model where business logic can reside physically close to whoever is consuming it, with latency measured in network milliseconds instead of hundreds.

## Getting Started with Cloudflare Workers

Workers uses the Service Worker pattern as its programming model, which means every incoming request passes through a handler you define. The API is deliberately minimalist: you define a listener for fetch events, process the request, and return a response. This simplicity hides a system cleverly designed for instant startup and execution in isolated environments.

To start developing, you need to install Wrangler, Cloudflare's official CLI for Workers. Wrangler isn't just a deployment tool—it's your complete development environment, allowing you to create new projects, test locally with Miniflare, and deploy with a single command.

```bash
npm install -g wrangler
```

The most basic Worker configuration creates a JavaScript file that intercepts HTTP requests and returns a response. The following code implements an endpoint that returns the current formatted time, demonstrating the simplicity of the model:

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === "/time") {
      const now = new Date();
      return new Response(JSON.stringify({
        timestamp: now.toISOString(),
        timezone: "UTC",
        message: "Edge function executed successfully"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response("Not Found", { status: 404 });
  }
};
```

When you deploy this code with `npx wrangler deploy`, it becomes available on a URL that Cloudflare distributes globally through its network of points of presence. There's no configuration for regions, load balancers, or auto-scaling. The code simply exists in all network locations simultaneously.

The Workers routing system allows you to define more complex patterns directly in your code. For applications that need multiple endpoints, you can implement a simple router or use a library like Hono, which offers a familiar API for developers who have already worked with frameworks like Express:

```javascript
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.text('Hello from the edge!'));
app.get('/api/users/:id', async (c) => {
  const userId = c.req.param('id');
  const user = await fetch(`https://api.example.com/users/${userId}`);
  return c.json(await user.json());
});
app.post('/api/process', async (c) => {
  const body = await c.req.json();
  // Edge processing
  return c.json({ status: 'processed', edge: 'cloudflare' });
});

export default app;
```

## Persistent storage with KV and D1

Running code at the edge is only part of the equation. Useful applications need state, and that's where Cloudflare's storage ecosystem differentiates itself. Workers offers multiple storage products, each optimized for different access patterns.

Cloudflare KV is a distributed key-value store designed for frequent read operations and low latency. Data is automatically replicated to thousands of edge locations, enabling millisecond-latency reads regardless of where the user is. Eventual consistency means writes can take a few seconds to propagate globally, but reads are extremely fast.

KV works exceptionally well for use cases like high-speed caches, application configuration, session stores, and any data that needs to be read frequently but updated occasionally. Implementing a simple cache demonstrates the pattern:

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cacheKey = new Request(url, request);
    const cache = caches.default;
    
    let response = await cache.match(cacheKey);
    
    if (response) {
      const headers = new Headers(response.headers);
      headers.set('X-Cache', 'HIT');
      return new Response(response.body, {
        status: response.status,
        headers
      });
    }
    
    response = await fetch(request);
    response = new Response(response.body, response);
    
    // Cache for 1 hour
    ctx.waitUntil(
      cache.put(cacheKey, response.clone())
    );
    
    const headers = new Headers(response.headers);
    headers.set('X-Cache', 'MISS');
    return response;
  }
};
```

For data requiring relational queries, D1 offers a distributed SQLite database. D1 creates read-only replicas at each edge location, enabling SQL queries with extremely low latency for read operations. Writes still need to go through a primary region, but the replication system ensures reads are served locally.

Creating a D1 database and its initial tables is done via configuration:

```yaml
# wrangler.toml
name = "my-edge-app"
compatibility_date = "2024-09-23"

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

The content you've provided is JavaScript code, not Portuguese text. There's nothing to translate in this code block - it's already written in English (JavaScript syntax and API strings like "Not Found").

If you have prose text in Portuguese that needs translating, please share it and I'll translate it for you.

## Object Storage with R2

R2 is Cloudflare's object storage offering, positioned as an S3 alternative with a crucial difference: there are no egress fees. For applications that serve large volumes of files to users globally, these savings can be substantial. R2 is compatible with the S3 API, which means existing client libraries work without modifications.

A common use case at the edge is serving processed images. You can store originals in R2 and use Workers to resize, compress, or convert formats on demand:

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1); // remove leading slash
    
    const object = await env.R2.get(path);
    
    if (!object) {
      return new Response("Not Found", { status: 404 });
    }
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    
    // Cache for 1 day at edge, 1 month in browser
    headers.set("Cache-Control", "public, max-age=86400");
    
    return new Response(object.body, { headers });
  }
};
```

## Automation with Cron Triggers

Workers don't just execute in response to HTTP requests. The Cron Triggers system allows scheduling periodic execution, enabling patterns like data synchronization, cache clearing, report generation, and maintenance tasks that would traditionally require a dedicated server or container running 24/7.

Configuring a cron job is declarative in wrangler.toml:

```toml
name = "my-cron-worker"
compatibility_date = "2024-09-23"

[triggers]
crons = ["0 */6 * * *", "0 9 * * 1"]  # Every 6 hours, every Monday at 9am

[[d1_databases]]
binding = "DB"
database_name = "reports"
database_id = "xxxxx"
```

The handler receives information about which cron triggered via the schedule event:

```javascript
export default {
  async scheduled(controller, env, ctx) {
    switch (controller.cron) {
      case "0 */6 * * *":
        await syncData(env);
        break;
      case "0 9 * * 1":
        await generateWeeklyReport(env);
        break;
    }
  },
  
  async fetch(request, env, ctx) {
    return new Response("Use scheduled triggers");
  }
};

async function syncData(env) {
  // Synchronizes data from external APIs
  const response = await fetch("https://api.external.com/sync");
  const data = await response.json();
  
  // Persists to D1
  for (const item of data) {
    await env.DB.prepare(
      "INSERT OR REPLACE INTO sync_records VALUES (?, ?)"
    ).bind(item.id, JSON.stringify(item)).run();
  }
}

async function generateWeeklyReport(env) {
  const { results } = await env.DB.prepare(
    "SELECT COUNT(*) as total FROM sync_records WHERE timestamp > datetime('now', '-7 days')"
  ).first();
  
  console.log(`Weekly sync count: ${results.total}`);
}
```

## AI Inference at the Edge

One of the most interesting additions to Workers is the ability to run machine learning models directly at the edge. Workers AI offers inference for models like Llama 3, Mistral, and Stable Diffusion, accessible through a simple REST API. For use cases that don't justify your own GPU infrastructure, this option democratizes access to generative AI capabilities.

The integration uses the AI binding available throughout the Worker:

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (url.pathname === "/chat") {
      const { message } = await request.json();
      
      const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: message }
        ]
      });
      
      return new Response(JSON.stringify({ response }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    if (url.pathname === "/summarize") {
      const { text } = await request.json();
      
      const result = await env.AI.run("@cf/facebook/bart-large-cnn", {
        input_text: text
      });
      
      return new Response(JSON.stringify({ summary: result.summary }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response("Not Found", { status: 404 });
  }
};
```

For text processing tasks like classification, entity extraction, or sentiment analysis, typical latency is in the hundreds of milliseconds, enabling real-time integrations that would be impractical with calls to centralized APIs.

## Deploy and development workflow

Wrangler offers a development loop that eliminates traditional infrastructure deployment friction. The `npx wrangler dev` command starts a local server that simulates the edge environment, including bindings for KV, D1, and other services. Code changes are reloaded instantly, enabling rapid iteration without build and deploy cycles.

For production environments, deployment is as simple as:

```bash
npx wrangler deploy
```

Wrangler automatically uploads the code, configures routes, and distributes to the global network. The total deployment time for typical code is seconds, not minutes, enabling CI/CD pipelines that deploy dozens of times a day if necessary.

Environment variables and secrets are managed through Wrangler, allowing different values to be configured per environment without modifying code:

```bash
# development
npx wrangler secret put API_KEY --env development

# production
npx wrangler secret put API_KEY --env production
```

Wrangler's environment system also allows environment-specific configuration in wrangler.toml, making it easy to maintain configuration that makes sense for all stages of development.

## When Edge Functions Make Sense

Not every application benefits from edge execution. The pattern shines in specific scenarios: APIs serving global users with low latency requirements, request processing that can be completed without access to centralized resources, and workloads that vary significantly in volume.

Applications with frequent access to heavy transactional databases still benefit more from a hybrid architecture, where the edge handles authentication, validation, and aggressive caching while complex requests go to centralized servers. Workers doesn't completely replace traditional servers, but makes them less necessary for a significant category of use cases.

Cost is also a valid decision factor. For low to medium traffic applications, Workers' free tier covers a substantial number of requests, and even above that limit, costs remain competitive with traditional serverless alternatives. The absence of egress fees on R2 specifically can represent significant savings for applications serving large amounts of data.

## Practical Takeaways

- Cloudflare Workers runs JavaScript, TypeScript, or Rust code in global edge locations without server management, with latency measured in milliseconds
- KV provides high-speed key-value storage for cache and configuration, while D1 allows SQL queries with replicas at each edge location
- R2 Storage eliminates egress fees, being ideal for applications serving large volumes of files to users globally
- Cron Triggers enable automation of periodic tasks without dedicated infrastructure, simplifying synchronization and maintenance
- Workers AI offers model inference such as Llama 3 directly at the edge, enabling AI without network latency
- The development workflow with Wrangler is optimized for rapid iteration, with local `dev` and `deploy` in seconds
- Edge functions are ideal for global APIs, processing independent requests, and applications that prioritize latency; complex database use cases benefit from hybrid architectures

## Sources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [Wrangler CLI GitHub Repository](https://github.com/cloudflare/wrangler)
## 📸 Cover image credit
- **Image:** [EDGE Shadow 25 loitering munition.jpg](https://commons.wikimedia.org/wiki/File%3AEDGE_Shadow_25_loitering_munition.jpg)
- **Author:** Unknown authorUnknown author
- **License:** [Public domain](https://en.wikipedia.org/wiki/Public_domain) · via Wikimedia Commons
