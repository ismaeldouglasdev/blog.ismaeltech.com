---
title: "How to Design Resilient REST APIs with Idempotency and Retries"
date: "2026-11-13"
category: "tutorial"
tags: ["api", "rest", "resiliência", "backend", "boas-práticas"]
excerpt: "Network failures and timeouts are part of any API's life. Learn how to combine idempotency, retries with backoff, and clear limits to avoid duplicates and keep systems stable."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-11-13-como-projetar-apis-rest-resilientes-com-idempotencia-e-retries.jpg"
lang: "en"
translation_of: "2026-11-13-como-projetar-apis-rest-resilientes-com-idempotencia-e-retries"
---

Network failures and timeouts are part of life for any production API, and ignoring that reality often gets expensive: duplicate charges, orders created twice, and inconsistent state across services. If you have ever had to explain why a single click produced two records, you already know resilience is not a luxury, it is a requirement. In this practical guide, you will learn how to design more reliable REST APIs by combining idempotency, controlled retries, and predictable responses so clients can safely try again.

## Why failures happen even with correct code

An HTTP call can fail at many points: flaky DNS, packet loss, a restarting load balancer, a deploy in the middle of a request, or simply a client-side timeout. The trickiest case is the ambiguous timeout: the client never receives a response, but the server may have already processed the operation. Retrying "automatically" seems harmless, yet for operations that create resources or charge money, the side effect happens again.

In this context, resilience does not mean nothing will ever fail. It means failures are expected and handled safely. Two ideas work together to achieve that: making operations repeatable without duplicate effects (idempotency), and defining when, how, and how many times it is worth trying again (retries).

## Idempotency: repeat without duplicating effects

In REST APIs, methods like `GET`, `PUT`, and `DELETE` are typically treated as idempotent: performing the same request multiple times should lead to the same final state. `POST`, often used to create resources or start payments, is not idempotent by nature. That is where an **idempotency key** comes in.

The strategy is straightforward: the client generates a unique identifier for the operation intent (for example, a UUID) and sends it in a header such as `Idempotency-Key`. The server stores the result associated with that key. If it receives another request with the same key, instead of processing everything again, it returns the original result.

```http
POST /v1/charges HTTP/1.1
Host: api.example.com
Content-Type: application/json
Idempotency-Key: 8d5f1b5c-5f0b-4f3b-a2b1-1d2a9c0e4f10

{
  "amount": 4990,
  "currency": "USD",
  "customer_id": "cus_123"
}
```

On the server side, the key must be tied to the correct context (for example, client + endpoint + key) and kept for a reasonable retention period. Storing the key without the request/result does not solve the problem: the goal is to return the same response (or an equivalent state) when a retry arrives.

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-11-13-como-projetar-apis-rest-resilientes-com-idempotencia-e-retries-1.jpg" alt="Safe retry flow with an idempotency key between client, API, and service" loading="lazy">
<figcaption>With a persisted Idempotency-Key, the client can resend the same request after a timeout without creating duplicate side effects.</figcaption>
</figure>

## What to store and how to respond

A robust idempotency design usually records: the key, a hash of the request, the operation status (in progress, completed, failed), and the produced response. A few important considerations:

- **Same key, different body:** treat this as an error (for example, `409 Conflict` or `422`) because it indicates incorrect key reuse.
- **Request in progress:** if another call arrives with the same key while the first is still processing, you can wait briefly and return the result, or respond with a state indicating processing is underway.
- **Deterministic failures:** if the operation failed due to validation, it often makes sense to cache that failure for the same key to avoid different outcomes for the same intent.
- **Scope and expiration:** define how long the key remains valid (hours or days, depending on the use case) and limit its scope to prevent collisions.

This pattern removes most duplication risk, but it only works well when the client also knows **when** it should try again.

## Retries with backoff and jitter

Not every error deserves a retry. As a practical rule, it makes sense to retry transient failures: timeouts, connection errors, and `429` (rate limit) or `5xx` responses. Validation `4xx` errors (such as `400` or `401`) usually indicate a problem with the request and should not be retried automatically.

When retrying, avoid immediate bursts of repeated attempts. The recommended approach is **exponential backoff with jitter**: increase the interval between attempts (1s, 2s, 4s, 8s...) and add randomness to prevent many clients from retrying at the same time and overwhelming a service that just recovered.

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

Notice two points: the example limits the number of attempts and only retries transient failures. In critical systems, combine this with **per-call timeouts**, a **circuit breaker**, and metrics to understand whether retries are helping or simply amplifying the problem.

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-11-13-como-projetar-apis-rest-resilientes-com-idempotencia-e-retries-2.jpg" alt="Chart showing exponential backoff with jitter between request attempts" loading="lazy">
<figcaption>Exponential backoff spaces out attempts, and jitter reduces synchronized traffic spikes during incidents.</figcaption>
</figure>

## Best practices for clients and servers

Resilience works best when client and server share a clear contract:

- **Make behavior explicit:** document which errors are retryable, whether the API supports `Idempotency-Key`, and how long results are stored.
- **Use consistent codes and messages:** `429` with `Retry-After`, `5xx` for transient failures, and stable responses for idempotency replays help the client decide what to do.
- **Set limits:** a maximum number of retries, a total wait budget, and per-operation deadlines prevent a failure from turning into cascading latency.
- **Observe the system:** log attempts, key collisions, and latency. Without observability, you cannot tell whether your protections are working.

These measures do not eliminate incidents, but they significantly reduce the impact when something goes wrong — which, sooner or later, it always does.

## Conclusion

Designing resilient REST APIs is less about preventing failures and more about handling them without corrupting data. Idempotency protects against duplicates in ambiguous-timeout scenarios, while retries with backoff and jitter give the system a chance to recover from transient instability. By combining a clear contract, well-implemented idempotency keys, and thoughtful retry policies, you deliver a far more predictable experience for API consumers and gain confidence when the network inevitably misbehaves.

## Sources

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) - Definitions of HTTP methods, idempotency semantics, and status codes.
- [MDN Web Docs: HTTP request methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) - Practical overview of method properties, including idempotency and safety.
- [AWS Architecture Blog: Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) - Explanation and comparison of backoff and jitter strategies for retries.
- [Stripe API: Idempotent requests](https://docs.stripe.com/api/idempotent_requests) - Real-world example of idempotency keys in payment APIs.
- [Google Cloud: Retry strategy](https://cloud.google.com/storage/docs/retry-strategy) - Recommendations on when and how to apply retries in network calls.
