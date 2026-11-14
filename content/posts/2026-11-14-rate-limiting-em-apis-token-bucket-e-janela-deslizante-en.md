---
title: "API rate limiting: token bucket, sliding window, and where to apply the limit"
date: "2026-11-14"
category: "tutorial"
tags: ["api", "rate-limiting", "backend", "resiliência", "boas-práticas"]
excerpt: "A traffic spike doesn't have to take your service down. Learn how to choose between token bucket and sliding window, where to apply the limit, and how to answer with 429 and Retry-After."
share_hook: "The spike that takes an API down is rarely an attack: it's a legitimate client with no pacing. Rate limiting is the missing brake."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-11-14-rate-limiting-em-apis-token-bucket-e-janela-deslizante.jpg"
lang: "en"
translation_of: "2026-11-14-rate-limiting-em-apis-token-bucket-e-janela-deslizante"
---

You know that early-morning alert: p95 blows up, the database saturates, and not a single line of code changed since the afternoon. The cause, when it shows up in the logs, is embarrassingly simple — one client synced two cron jobs and fired two hundred requests per second against an expensive endpoint. Nobody attacked your system; there was just no brake. Rate limiting is that brake: an explicit contract of how much each consumer may demand from your service, enforced before the damage happens. In this guide, you'll see how limits work under the hood (token bucket, fixed window, and sliding window), where to place them in your architecture, and how to return responses that teach clients to behave instead of just screaming `429`.

## What rate limiting solves (and what it doesn't)

Capping request rate is a protection decision and a fairness decision at once. Protection, because any endpoint that triggers an expensive query — reports, full-text search, exports — becomes a weapon in the hands of a poorly written loop. Fairness, because without a limit one noisy neighbor consumes capacity that belongs to everyone. A well-calibrated threshold guarantees that one client's load doesn't degrade everyone else's latency.

That said, rate limiting is no silver bullet. It doesn't replace authentication (per-IP limits don't identify users), it doesn't protect from abusive logic inside the contractual limit (two hundred legitimate requests can cost as much as an attack), and it doesn't solve genuine demand spikes — for that you have queues, caching, and horizontal scaling. Treat the limit as part of a contract: it says "up to here, you're fine"; what to do when you hit the ceiling is an agreement that must be written into the response.

## Token bucket: bursts accepted, pace limited

The algorithm most used in production is the *token bucket*. The idea is literal: there's a bucket with capacity for N tokens. A drip refills tokens at a fixed rate — say, 10 per second. Every request must consume a token to pass. If the bucket has tokens, the request is approved on the spot; if it's empty, it gets `429 Too Many Requests`.

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-11-14-rate-limiting-em-apis-token-bucket-e-janela-deslizante-1.jpg" alt="Token bucket flow with fixed token refill, per-request decision, and an approve or 429 path" loading="lazy">
<figcaption>In a token bucket, the refill is constant and approval consumes a token: short bursts pass, the average pace stays limited.</figcaption>
</figure>

The most useful property of this design is how it behaves under bursts. Because the bucket stores unused tokens, a client that stayed quiet for ten seconds accumulates "credit" and can fire a short burst without errors — as long as the burst fits the bucket. Then the pace is dictated by the refill rate again. In practice, this models real life well: legitimate clients aren't perfectly constant, they pulse. Two parameters control everything: bucket **capacity** (acceptable burst size) and **refill rate** (sustainable pace). A bucket of 50 with a 5/s refill accepts a burst of 50 followed by 5 requests per second indefinitely.

The mirrored variant is the *leaky bucket*: instead of tokens going in, the queue drains at a constant rate — useful when you want to **smooth** the traffic that reaches the backend (with a token bucket, what enters can leave in a burst; with leaky bucket, what leaves is always constant). Tools like NGINX `limit_req` implement this smoothing with the `burst` + `nodelay` parameters, which is why its default configuration behaves like a token bucket at the edge and like a queue in processing.

## Fixed window, sliding window, and the boundary problem

The classic competing algorithm is the **fixed window**: count requests per time interval (the window) and reject once the ceiling is crossed. It's cheap — one counter per key per window — but it has a famous flaw: the **window boundary**. With a 100/minute limit, a client can fire 100 requests in the last 5 seconds of one minute and another 100 in the first 5 seconds of the next. No individual window was violated, yet in 10 seconds you received 200 requests — twice the contracted pace.

The **sliding window** removes the boundary by measuring a "rolling" interval instead of fixed ones. Two implementations dominate:

- **Sliding window log:** store the timestamp of every request for the key and count how many fall inside the last minute. Precise, and expensive in memory at high rates.
- **Sliding window counter (the pragmatic one):** interpolate the previous window's counter with the current one, weighted by elapsed time. It's the canonical approximation in Redis implementation patterns — O(1) cost, small and acceptable error for rate limiting.

When to use each? Fixed window suits coarse quotas (daily usage of a plan). Token bucket suits burst-prone endpoints (login, webhooks). Sliding window suits public API contracts, where the limit number needs to be honest in practice, not just on average.

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-11-14-rate-limiting-em-apis-token-bucket-e-janela-deslizante-2.jpg" alt="429 sequence with Retry-After and X-RateLimit headers between client and API, with a wait and a successful retry" loading="lazy">
<figcaption>A 429 with Retry-After turns an error into a contract: the client knows when to come back without worsening the overload.</figcaption>
</figure>

## Where to apply it: gateway, application, or database

Where the limit sits in the architecture matters as much as the algorithm. The three classic positions:

- **At the gateway/edge (NGINX, Cloudflare, Kong, API Gateway):** the cheapest limit of all — rejected requests never consume application CPU. It's where you apply per-IP, per-token, and per-route limits. Two risks: behind a load balancer, the IP the gateway sees may be the proxy's (fix with trusted `X-Forwarded-For`), and per-IP limits punish corporate users behind NAT.
- **In the application (middleware):** costlier, but richer — you limit by user, by plan, by estimated request cost. Libraries like `slowapi` (FastAPI) and `express-rate-limit` cover the simple case; for state shared across instances, the counter must live outside the process (Redis is the default).
- **At the database/queues:** the last line of defense. Tools like ProxySQL or even `max_connections` cap the damage, but by then the request has already spent CPU. Use as secondary protection, never as the primary policy.

The practical rule: **coarse limit at the gateway, fine limit in the application**. The gateway rejects the obvious by IP/route; the application decides by identity and business value. Keeping rate-limit state in Redis with a short TTL is the most common design: the key expires by itself, no extra cleanup needed.

## 429, Retry-After, and the headers your client needs

Rejecting is the easy half; communicating the rejection is where most APIs fail. A bare `429` leaves the client retrying blind, and every blind retry worsens exactly the problem the limit meant to solve. The response must say three things:

- **When to come back:** the `Retry-After` header (in seconds or an HTTP date). This is the most valuable piece of information you can send.
- **How much is left:** headers like `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` (or the newer standard being drafted at IETF, `RateLimit-Limit`/`RateLimit-Remaining`/`RateLimit-Reset`). A client that sees its balance self-regulates before hitting the ceiling.
- **Why it stopped:** an error body with a readable code (`rate_limit_exceeded`) keeps clients from treating 429 as a bug.

RFC 6585 defined 429 precisely for this case, and the recommendation is old: include `Retry-After`. At the gateway, configure NGINX to propagate limit headers or add them in middleware — one line of configuration that saves dozens of support tickets.

## How the client should react (and how this connects with retries)

For API consumers, the golden rule is: **429 is a request to wait, not an error to ignore or to retry immediately**. A respectful client reads `Retry-After` and schedules the attempt; if the header is missing, it applies exponential backoff with jitter — the same mechanism as the previous post on idempotency and retries, and the two techniques complement each other: backoff defines *when* to try again, rate limiting says *how much* you may try.

One detail that separates amateur clients from professional ones: before betting on retries, reduce the **arrival rate**. Debounce UI events, real pagination instead of client-side loops, and batching when the API offers it. The best rate limit is the one you never touch because the client asked for less.

## Common rate limiting mistakes

- **One limit for everyone:** a single per-IP ceiling breaks behind NAT/CGNAT and is bypassed by anyone who switches IP. Limit by authenticated identity whenever it exists.
- **429 without `Retry-After`:** the client retries immediately and the limit becomes an error amplifier instead of protection.
- **In-memory counter with multiple instances:** each instance has its own ceiling; the effective limit becomes N × limit. Shared state (Redis) fixes it.
- **Fixed window in a public contract:** the boundary spike described above breaks the promise without violating the number. Prefer a sliding counter when the limit is a promise.
- **Hiding the reason:** a 429 with an empty body becomes a false-positive bug in the client's monitoring. A JSON with code and message costs nothing and saves hours.
- **Not treating the limit as an SLO:** monitor the 429 rate per key and per route. A sudden spike means a misbehaving client — or a badly calibrated limit. Both deserve an alert.

## Conclusion

Well-done rate limiting is a contract in three layers: an algorithm that makes sense for your traffic pattern (token bucket for bursts, sliding window for honest promises), an architectural position that rejects cheaply before expensively (gateway first, application for the fine-grained part), and responses that give the client everything it needs to self-regulate (429, `Retry-After`, and balance headers). Configure this once and the late-night spike that opened this post becomes a nice chart of 429s on your dashboard — not an incident.

## Sources

- [RFC 6585: Additional HTTP Status Codes](https://datatracker.ietf.org/doc/html/rfc6585) - Defines 429 (Too Many Requests) and recommends the Retry-After header.
- [MDN Web Docs: 429 Too Many Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429) - Status semantics and Retry-After usage.
- [NGINX Blog: Rate Limiting with NGINX and NGINX Plus](https://blog.nginx.org/blog/rate-limiting-nginx) - Reference implementation of limit_req, burst, and nodelay.
- [Stripe Docs: Rate limits](https://docs.stripe.com/rate-limits) - Real-world limit policy and client guidance.
- [GitHub REST API: Rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits) - X-RateLimit headers and expected client behavior.
- [IETF draft-ietf-httpapi-ratelimit-headers](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/) - Ongoing standardization of the RateLimit-* headers.
