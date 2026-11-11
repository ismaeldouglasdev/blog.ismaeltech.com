---
title: "UUID v4: why the random ID is still the right call"
date: "2026-10-03"
category: "tutorial"
tags: ["uuid", "javascript", "databases"]
excerpt: "A universally unique identifier looks like a shortcut until you need an index in Postgres and the ID size starts to hurt. An honest look at when UUID is the right choice and when it isn't."
share_hook: "UUID became the industry default for a reasonable reason, and for one reason few people admit: it removes the work of coordinating inserts."
cover:
  image: "/covers/2026-10-03-uuid-v4-por-que-o-id-aleatorio-ainda-e-a-escolha-certa.jpg"
comments: true
translationKey: "2026-10-03-uuid-v4-por-que-o-id-aleatorio-ainda-e-a-escolha-certa"
---

There comes a point in every growing project where a table's id stops being an
integer. You start with `SERIAL`, the `id` is 1, 2, 3, and everything works. Then
you need to merge two environments, import data, accept events from a machine
that never touched your database, and `1` stops being true.

That's when most people reach for the UUID. And they reach for it thinking the
UUID solves a uniqueness problem. It does — but that's the least interesting
part of it.

## What a UUID actually is

UUID stands for Universally Unique Identifier: a 128-bit identifier standardized
in RFC 4122, written as eight-four-four-four-twelve hexadecimal characters:

```
9f8e7d6c-5b4a-4392-8180-7f6e5d4c3b2a
```

The "universally" is what trips people up. It isn't a magic property of the
number — it's a property of the **process that generated it**. Nobody
coordinates these IDs. Every machine, every service, every browser generates its
own, and the chance of a collision between two of them is negligible.

That detail has a consequence worth keeping in mind: UUID works best *precisely
when there is no central place*. That's why it dominates message queues,
distributed systems, and anywhere two producers have to agree on an id without
talking to a database.

## The anatomy of a UUID v4

A UUID isn't 128 bits of randomness. It has structure, and that structure is what
distinguishes the versions.


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-10-03-uuid-v4-por-que-o-id-aleatorio-ainda-e-a-escolha-certa-1.jpg" alt="UUID v4: why the random ID is still the right call" loading="lazy">
<figcaption>Globally Unique Identifier is a special type of identifier used in software applications in order to provide a reference number which is unique in any context f. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AGlobally_Unique_ID_%2851157352349%29.jpg">Globally Unique ID (51157352349).jpg</a> por Exey Panteleev from Moscow, Russia — <a href="https://creativecommons.org/licenses/by/2.0">CC BY 2.0</a> · via Wikimedia Commons</figcaption>
</figure>

<figure>
<img src="/covers/2026-10-03-uuid-v4-por-que-o-id-aleatorio-ainda-e-a-escolha-certa.jpg" alt="UUID v4: why the random ID is still the right call" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>

In a v4 UUID like `9f8e7d6c-5b4a-4392-8180-7f6e5d4c3b2a`:

- The first block `9f8e7d6c` is 32 random bits
- The second block `5b4a` starts with the nibble `4` — the **version identifier**
- The third block `4392` starts with `4`, `5`, `8`, or `9` — the **variant** (the
  bit layout reserved by the RFC)
- The rest is random

That is 122 bits of usable entropy, not 128. This is the math behind the famous
line about how many IDs you'd have to generate for a 50% chance of a collision.

## The cost nobody mentions

A bare v4 UUID, with nothing layered on top, is a **36-character** string. Two
consequences:

**Index size.** A `UUID` primary key stored as `TEXT` or `VARCHAR(36)` is not just
bigger than a `BIGINT`, it's badly aligned for most things. In Postgres, a pure
16-byte `UUID` is the practical choice; `VARCHAR(36)` is waste. The common advice
is to store it as `UUID`/`BYTEA` and expose it as a string.

**Ordering.** v4 is random. As a primary key, that turns into page splits: every
insert anywhere in the index can push pages around. On a high-write table the
cost is real, and it shows up in `pg_stat_user_indexes` or in inserts that take
milliseconds.

There are escapes for both, and they're worth knowing before you choose. **UUID
v7** is the direct answer: 48 timestamp bits at the top, randomness below. It
stays a UUID — same format, same compatibility — but it sorts by time, which
fixes the page split and makes the index behave like a growing integer. For most
new systems, that's the call I'd make without thinking hard about it.

## When not to use UUID

- **A user-facing key that also has to sort.** If insertion order matters to the
  client, a growing integer is simpler and gives you nothing for free.
- **A table you query by prefix.** `WHERE id LIKE '9f8e%'` doesn't use an index on
  v4; on v7 the prefix is a timestamp, and it does.
- **A table that will never be merged or imported.** If it exists in one database
  and nothing else consumes the id, `SERIAL`/`BIGSERIAL` is simpler.


And there's the opposite mistake: **you don't need the whole identifier**. Plenty
of teams use a UUID and keep a sequential `id` alongside it, duplicating the work
for no reason.

## When to use it

- Two or more sources write to the same table
- Rows travel between environments and need to join without renaming
- The id is created client-side and the database shouldn't be consulted for it
- Someday you'll open the project and someone will generate ids elsewhere

In those cases, UUID is the answer with the least risk for whoever doesn't know
the future yet.

## Generating them correctly in JavaScript

One detail that shows up in code review: **don't use `Math.random()`**.

```js
// Works until someone needs it. Math.random is not a CSPRNG.
function badId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
```

`Math.random()` isn't a cryptographic generator, and the npm `uuid` package used
it as a fallback until version 9. With platform APIs available, it became a
dependency you don't need: `crypto.randomUUID()` is in the browser and in Node.js
and does the whole job.

```js
// One path. The rest of the app doesn't care where the id came from.
export function generateBatch(count) {
  return Array.from({ length: count }, () => crypto.randomUUID());
}
```

If the environment lacks `crypto.randomUUID()` — rare, but it happens on older
Node and in non-secure contexts — the fallback is `crypto.getRandomValues()` with
the version and variant bits set by hand:

```js
function uuidV4Fallback() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
```

That's enough to generate one or a few. When you need dozens, you can roll it
yourself — but at that point the question worth asking is whether you're minting
thousands of ids client-side per request, which is a sign the architecture wants
a conversation.

If you need to generate a batch right now, the [UUID v4
generator](/ferramentas/uuid) does it without making you think about any of this.

## The short version

UUID is the industry default because it solves the right problem: it removes the
need for coordination. The price is the index, and the price drops if you pick
**v7** over `v4**. Outside the distributed case, it's complexity you bought
without needing it.