---
title: "SOLID Principles Explained with Real Code Examples"
date: "2026-09-04"
category: "article"
tags: ["solid", "arquitetura", "boas-praticas"]
excerpt: "SOLID principles explained with real code: SRP, OCP, LSP, ISP, and DIP applied to an e-commerce integration case."
share_hook: "Each SOLID principle with the code before and after, from an integration that broke two months after delivery."
comments: true
translationKey: "2026-09-04-principios-solid-explicados-com-exemplos-de-codigo-real"
---

## Introduction

Imagine a customer requests an integration that synchronizes inventory with a marketplace. You deliver the code, but later need to add a sales report by category. What was a simple module is now full of conditionals, methods that do everything, and little room for change.

Here I explain how the five SOLID principles can keep code from evolving into an uncontrollable monolith. Each principle comes with an example in one of the two languages I use daily: TypeScript in the synchronization service and Python in the channel engine. At the end I bring the two together in a real case, and I also write about **when it is not worth it** to apply any of this.

> This is the long post in the series. If you want the condensed version, with the same principles on a single page, see [Clean architecture in TypeScript: SOLID principles applied](https://blog.ismaeltech.com/2026-09-21-arquitetura-limpa-em-typescript-principios-solid-aplicados/). There the focus is folder structure and short classes; here it is dependency, contract, and what to do when the third channel shows up.

---

## Single Responsibility Principle (SRP)

**Basic rule:** a class or module should have only one reason to change.

### Why it matters

When a single class handles reading from an external API, transforming data, and sending email, any change in one of those domains carries a risk of regression in the others. In an early version, all these responsibilities were mixed together. Changing the payload format broke other parts of the code due to cross-dependencies.

### Example in TypeScript

Before, everything in a single class:

```ts
// O vocabulary do domínio: o que sai cru da API e o que entra no banco.
export interface RawProduct {
  sku: string;
  quantity: number;
  updatedAt: string;
}

export interface Product {
  sku: string;
  quantity: number;
  updatedAt: Date;
}

export class SyncService {
  async run() {
    const products = await this.fetchFromOspOS();
    const normalized = this.normalize(products);
    await this.saveToDb(normalized);
    await this.notifyTeam(normalized);
  }

  private async fetchFromOspOS(): Promise<RawProduct[]> { throw new Error('omitted'); }
  private normalize(items: RawProduct[]): Product[] { throw new Error('omitted'); }
  private async saveToDb(data: Product[]): Promise<void> { /* ... */ }
  private async notifyTeam(data: Product[]): Promise<void> { /* ... */ }
}
```

Four reasons to change in one class. The split looks like this, with each piece responsible for one thing:

```ts
// Linha bruta retornada pela API
export interface OsposProductRow {
  sku: string;
  qty: string | number;
  modified: string;
}

// Só o que o fetcher precisa da API. axios entra na composição, não aqui.
export interface OsposClient {
  get(
    path: string,
    config: { params: { modifiedSince: Date } },
  ): Promise<{ data: OsposProductRow[] }>;
}

export class OspOSFetcher implements ProductFetcher {
  constructor(
    private client: OsposClient,
    private since: Date,
  ) {}

  async fetch(): Promise<RawProduct[]> {
    const response = await this.client.get('/api/products', {
      params: { modifiedSince: this.since },
    });
    return response.data.map((row: OsposProductRow) => ({
      sku: row.sku,
      quantity: Number(row.qty ?? 0),
      updatedAt: row.modified,
    }));
  }
}

export class ProductNormalizer implements ProductNormalizerPort {
  normalize(items: RawProduct[]): Product[] {
    return items
      .filter((item) => item.sku.trim() !== '')
      .map((item) => ({
        sku: item.sku.trim().toUpperCase(),
        quantity: Math.max(0, Math.trunc(item.quantity)),
        updatedAt: new Date(item.updatedAt),
      }));
  }
}

export class PostgresInventoryRepository implements InventoryRepositoryPort {
  constructor(private readonly pool: PostgresPool) {}

  async upsert(products: Product[]): Promise<void> {
    // O SQL e o snake_case moram aqui, e só aqui.
    await this.pool.query(
      'INSERT INTO products (sku, quantity) VALUES ($1, $2)',
      products
    );
  }
}

export class SlackNotifier implements Notifier {
  constructor(private readonly webhookUrl: string) {}

  async send(summary: SyncSummary): Promise<void> {
    await fetch(this.webhookUrl, {
      method: 'POST',
      body: JSON.stringify({
        text: `Sync concluido: ${summary.total} itens as ${summary.at.toISOString()}`,
      }),
    });
  }
}
```

Notice what changed: four units are left, and each one has a separate reason to exist. `ProductNormalizer` is pure and testable with a literal array, with no database, no network, and no mock. The SQL stayed inside the repository and the alert stayed inside the notifier, so touching one of the four never touches the other three.

---

## Open/Closed Principle (OCP)

**Basic rule:** modules should be open for extension, but closed for modification.

### Why it matters

When adding a new sales channel, changing the core class, the risk of breaking the integration already working with Mercado Livre grew. Applying OCP means the existing structure stays intact and the new capability arrives as an additional module.

### Example in Python

Before, the engine knew every channel by name — and each new channel required a new `if` inside it:

```python
from typing import List, Protocol


class StockItem(Protocol):
    sku: str
    quantity: int


class SyncEngine:
    def __init__(self, ml_client, shopee_client, repository) -> None:
        self.ml_client = ml_client
        self.shopee_client = shopee_client
        self.repository = repository

    def run(self, items: List[StockItem]) -> None:
        # Para cada canal novo, um `if` novo aqui dentro: o motor precisa ser
        # modificado. É exatamente isso que o OCP proíbe.
        for item in items:
            if self.ml_client.enabled:
                self.ml_client.update_items([item])
            if self.shopee_client.enabled:
                self.shopee_client.update_items([item])
                self.repository.mark_published([item.sku])
```

After, the channel arrives as a module and the engine is never touched:

```python
from abc import ABC, abstractmethod
from typing import Dict, List, Protocol


class StockItem(Protocol):
    sku: str
    quantity: int


class ChannelAdapter(ABC):
    """Contrato de publicação. Não impõe teto de tamanho de lote."""

    @abstractmethod
    def push(self, items: List[StockItem]) -> None:
        ...


class MercadoLivreAdapter(ChannelAdapter):
    def __init__(self, client, repository) -> None:
        self.client = client
        self.repository = repository

    def push(self, items: List[StockItem]) -> None:
        payload = [
            {
                "sku": item.sku,
                "quantity": item.quantity,
                "status": "active" if item.quantity > 0 else "paused",
            }
            for item in items
        ]
        self.repository.mark_published([item["sku"] for item in payload])
        self.client.update_items(payload)


class ShopeeAdapter(ChannelAdapter):
    def __init__(self, client, repository) -> None:
        self.client = client
        self.repository = repository

    def push(self, items: List[StockItem]) -> None:
        for item in items:
            self.client.update_item(
                {"sku": item.sku, "stock_info": {"stock": item.quantity}}
            )
            self.repository.mark_published([item.sku])


class SyncEngine:
    def __init__(self, adapters: List[ChannelAdapter]) -> None:
        self.adapters = adapters

    def sync(self, items: List[StockItem]) -> None:
        for adapter in self.adapters:
            adapter.push(items)
```

The `SyncEngine` class knows no details of any channel. When a new marketplace appears, it is enough to implement `ChannelAdapter` and register the instance in the list passed to the constructor — the iteration loop does not change.

---

## Liskov Substitution Principle (LSP)

**Basic rule:** objects of a subclass must be able to replace objects of the superclass without altering the expected behavior.

### Why it matters

The case that cost me the most time was the Shopee limit. Its API accepts **at most 50 items per call**. The first version of the adapter did the following, and that is a classic LSP violation:

```python
class ShopeeAdapter(ChannelAdapter):
    MAX_ITEMS = 50

    def push(self, items: List[StockItem]) -> None:
        if len(items) > self.MAX_ITEMS:
            raise ValueError("Shopee aceita no máximo 50 itens por chamada")
        # ...
```

The `ChannelAdapter.push` contract accepts any list. `ShopeeAdapter` added a **stronger precondition**: a caller that was written against the contract and previously could pass 10 thousand items at once now gets an exception when it receives a `ShopeeAdapter`. The subclass is less substitutable than the superclass — exactly the opposite of what LSP asks for.

The fix is to move the responsibility inside the adapter, instead of dumping it on the caller:

```python
class ShopeeAdapter(ChannelAdapter):
    MAX_ITEMS = 50

    def __init__(self, client, repository) -> None:
        self.client = client
        self.repository = repository

    def push(self, items: List[StockItem]) -> None:
        # O adapter honors o contrato: aceita o lote inteiro e fatia internamente.
        for start in range(0, len(items), self.MAX_ITEMS):
            lote = items[start : start + self.MAX_ITEMS]
            self.client.update_items(
                [
                    {"sku": item.sku, "stock_info": {"stock": item.quantity}}
                    for item in lote
                ]
            )
        self.repository.mark_published([item.sku for item in items])
```

Now whoever calls `push` does not know the limit of 50 exists. The same `SyncEngine` code works with a batch of 10 items or 10 thousand, and with any other adapter. The Shopee restriction still exists, but it has become an implementation detail.

That is the point that usually goes unnoticed: **what must not break is the behavior the client already relied on.** A subclass that throws where the superclass guaranteed success is not substitutable, however well documented it is.

---

## Interface Segregation Principle (ISP)

**Basic rule:** clients should not be forced to depend on interfaces they do not use.

### Why it matters

When an interface requires many methods, classes that only need part of them end up implementing empty methods. The interface grows, the code bloats, and nobody gains anything.

### Example in Python

The problem is not the number of methods, it is the **client**. Before, a single contract for everything:

```python
from abc import ABC, abstractmethod


class HealthCheck(ABC):
    @abstractmethod
    def ping(self) -> bool: ...
    @abstractmethod
    def get_latency(self) -> float: ...
    @abstractmethod
    def alert(self, msg: str) -> None: ...
```

Then, contracts separated by consumer:

```python
from abc import ABC, abstractmethod


class Pingable(ABC):
    @abstractmethod
    def ping(self) -> bool: ...


class LatencyMeasurable(ABC):
    @abstractmethod
    def get_latency(self) -> float: ...


class AlertCapable(ABC):
    @abstractmethod
    def alert(self, msg: str) -> None: ...


class OpenAiProvider(Pingable, LatencyMeasurable):
    def ping(self) -> bool:
        return self.client.models.list() is not None

    def get_latency(self) -> float:
        return self.last_latency_ms


class PagerDutyNotifier(AlertCapable):
    def __init__(self, client) -> None:
        self.client = client

    def alert(self, msg: str) -> None:
        self.client.trigger_incident(msg)


class LocalOllamaProvider(Pingable):
    """Não mede latência com precisão; não é obrigado a fingir que mede."""

    def ping(self) -> bool:
        return self.client.health() == "ok"


def watch(provider: Pingable) -> bool:
    """O monitor de liveness só precisa saber se o processo responde."""
    return provider.ping()
```

Nobody implements what it does not use: `LocalOllamaProvider` has neither `get_latency` nor `alert`, and `PagerDutyNotifier` has neither `ping` nor `get_latency`. `watch` declares that it only needs `ping`, so it never imports `LatencyMeasurable`. The segregation is on the client side: each consumer declares the minimum it uses.

---

## Dependency Inversion Principle (DIP)

**Basic rule:** high-level modules should not depend on low-level modules; both should depend on abstractions.

### Why it matters

Wiring business logic directly to a specific driver creates tight coupling. When you need to swap the database, all business code gets stuck to that driver. DIP exists to invert that dependency so the implementation can be swapped without touching business rules.

### Example in TypeScript

First, the domain types and the abstractions:

```ts
export interface Lead {
  id: string;
  email: string;
  company: string;
  enrichedAt: string | null;
}

export interface LeadRepository {
  save(lead: Lead): Promise<void>;
  findById(id: string): Promise<Lead | null>;
}

// A linha crua do banco. O snake_case do SQL é convertido aqui, e só aqui.
export interface LeadRow {
  id: string;
  email: string;
  company: string;
  enriched_at: string | null;
}

function toLead(row: LeadRow): Lead {
  return {
    id: row.id,
    email: row.email,
    company: row.company,
    enrichedAt: row.enriched_at,
  };
}

// As implementações dependem de abstrações do driver, não dos pacotes
// sqlite3/pg: é por isso que a mesma porta serve SQLite e Postgres.
export interface SqliteDatabase {
  run(sql: string, params: unknown[]): Promise<void>;
  get(sql: string, params: unknown[]): Promise<LeadRow | undefined>;
}

export interface PostgresPool {
  query(sql: string, params: unknown[]): Promise<{ rows: LeadRow[] }>;
}
```

Then, the implementations — each one hiding its own driver:

```ts
export class SqliteLeadRepository implements LeadRepository {
  constructor(private db: SqliteDatabase) {}

  async save(lead: Lead): Promise<void> {
    await this.db.run(
      "INSERT INTO leads (id, email, company, enriched_at) VALUES (?, ?, ?, ?)",
      [lead.id, lead.email, lead.company, lead.enrichedAt],
    );
  }

  async findById(id: string): Promise<Lead | null> {
    const row = await this.db.get("SELECT * FROM leads WHERE id = ?", [id]);
    return row ? toLead(row) : null;
  }
}

export class PostgresLeadRepository implements LeadRepository {
  constructor(private pool: PostgresPool) {}

  async save(lead: Lead): Promise<void> {
    await this.pool.query(
      "INSERT INTO leads (id, email, company, enriched_at) VALUES ($1, $2, $3, $4)",
      [lead.id, lead.email, lead.company, lead.enrichedAt],
    );
  }

  async findById(id: string): Promise<Lead | null> {
    const { rows } = await this.pool.query("SELECT * FROM leads WHERE id = $1", [id]);
    return rows[0] ? toLead(rows[0]) : null;
  }
}
```

And the business service, which sees **only** the interface:

```ts
export class LeadEnrichmentService {
  constructor(
    private repo: LeadRepository,
    private enrich: (raw: Lead) => Promise<Partial<Lead>>,
  ) {}

  async enrichAndSave(raw: Lead): Promise<void> {
    const enriched = await this.enrich(raw);
    await this.repo.save({ ...raw, ...enriched, enrichedAt: new Date().toISOString() });
  }
}
```

Swapping databases is one line in the composition layer. Not a single line of `LeadEnrichmentService` changes, and the service does not even know which driver is on the other side.

---

## All the principles together in a real case

### Context

A common case is synchronizing catalog and inventory with multiple marketplaces without each new channel requiring a full rewrite of the system.

### Final architecture

There are two processes, and the separation is deliberate — ingest and the fan-out to channels have different failure cycles:

```
     ┌──────────────────────── ingest (TypeScript) ─────────────────────────┐
     │                                                                      │
     │  OspOSFetcher ──▶ ProductNormalizer ──▶ PostgresInventoryRepository  │
     │        │                  │                          │               │
     │        └──────────────────┴──────────────────────────┘               │
     │                           │                                          │
     │  SlackNotifier — notifica o time, fora do caminho do fan-out         │
     │───────────────────────────┼──────────────────────────────────────────│
                                │ publica snapshot
                                ▼
     ┌────────────────────────── fan-out (Python) ──────────────────────────┐
     │                                                                      │
     │                        SyncEngine                                    │
     │                             │                                        │
     │           ┌─────────────────┼─────────────────────┐                  │
     │           ▼                 ▼                     ▼                  │
     │  MercadoLivreAdapter  ShopeeAdapter   (futuro TikTokAdapter)         │
     └──────────────────────────────────────────────────────────────────────┘
                                │ publica snapshot
                                ▼
     ┌───────────────────────── fan-out (Python) ─────────────────────────┐
     │                                                                    │
     │                      SyncEngine                                    │
     │                           │                                        │
     │           ┌               ┼                       ┐                │
     │           ▼               ▼                       ▼                │
     │  MercadoLivreAdapter  ShopeeAdapter   (futuro TikTokAdapter)       │
     └────────────────────────────────────────────────────────────────────┘
                                  │ publica snapshot
                                  ▼
     ┌──────────────── fan-out (Python) ─────────────────────────────┐
     │                                                                │
     │                      SyncEngine                                │
     │                            │                                   │
     │        ┌───────────────────┼───────────────────┐               │
     │        ▼                   ▼                   ▼               │
     │  MercadoLivreAdapter  ShopeeAdapter   (futuro TikTokAdapter)   │
     └────────────────────────────────────────────────────────────────┘
```

The role of each principle in this design:

* **SRP** — fetching, normalizing, persisting, notifying, and publishing are five responsibilities, in five units. The `SyncEngine` iterates adapters; it does not know what a product is.
* **OCP** — adding a channel is writing a new adapter and registering it in the list. `SyncEngine` and `SyncOrchestrator` are not touched.
* **LSP** — all adapters honor the same contract: whoever calls `push` hands over a batch and does not know about Shopee's limit of 50 items. The restriction lives inside the adapter.
* **ISP** — the `SyncOrchestrator` consumes `Notifier`, and nothing else. It is the same idea as the Python example above: each consumer declares the minimum it uses, and a notifier that only sends messages does not have to implement metrics.
* **DIP** — the `SyncOrchestrator` depends on four *ports* (`ProductFetcher`, `ProductNormalizerPort`, `InventoryRepositoryPort`, `Notifier`); the `SyncEngine` depends on `ChannelAdapter`. Neither imports the concrete implementation on the other side.

### Composition code (TypeScript)

The ports declared where the orchestrator is defined:

```ts
// orchestrator.ts
export interface ProductFetcher {
  fetch(): Promise<RawProduct[]>;
}

export interface ProductNormalizerPort {
  normalize(items: RawProduct[]): Product[];
}

export interface InventoryRepositoryPort {
  upsert(products: Product[]): Promise<void>;
}

export interface SyncSummary {
  total: number;
  at: Date;
}

export interface Notifier {
  send(summary: SyncSummary): Promise<void>;
}

export class SyncOrchestrator {
  constructor(
    private fetcher: ProductFetcher,
    private normalizer: ProductNormalizerPort,
    private repo: InventoryRepositoryPort,
    private notifier: Notifier,
  ) {}

  async run(): Promise<SyncSummary> {
    const raw = await this.fetcher.fetch();
    const products = this.normalizer.normalize(raw);
    await this.repo.upsert(products);
    const summary = { total: products.length, at: new Date() };
    await this.notifier.send(summary);
    return summary;
  }
}
```

And the layer that picks the implementations — the only place in the system that knows concrete classes:

```ts
// ospos-client.ts — o adapter que traduz HTTP em OsposClient.
import axios from "axios";
import type { OsposClient, OsposProductRow } from "./fetcher";

export function createOsposClient(baseUrl: string, token: string): OsposClient {
  return {
    async get(path, config) {
      const response = await axios.get<{ data: OsposProductRow[] }>(
        `${baseUrl}${path}`,
        {
          params: { modifiedSince: config.params.modifiedSince.toISOString() },
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return { data: response.data.data };
    },
  };
}
```

```ts
// compose.ts
import { OspOSFetcher, ProductNormalizer } from "./fetcher";
import { createOsposClient } from "./ospos-client";
import { PostgresInventoryRepository } from "./repository";
import { SlackNotifier } from "./notification";
import { SyncOrchestrator } from "./orchestrator";
import { Pool } from "pg";

// A janela da sincronização é uma decisão da composição, não do fetcher.
const SINCE = new Date(Date.now() - 24 * 60 * 60 * 1000);

const orchestrator = new SyncOrchestrator(
  new OspOSFetcher(
    
    SINCE,
  ),
  new ProductNormalizer(),
  // O driver concreto aparece uma única vez, aqui na composição. O adapter
  // só recebe a abstração PostgresPool, então trocar de banco não toca em
  // nenhuma linha do orquestrador.
  new PostgresInventoryRepository(
    new Pool({ connectionString: process.env.DATABASE_URL! }),
  ),
  new SlackNotifier(process.env.SLACK_WEBHOOK_URL!),
);

orchestrator
  .run()
  .then((summary) => console.log(`Sincronizados ${summary.total} itens`))
  .catch((err) => console.error("Erro na sincronização", err));
```

Four arguments, four parameters: the code compiles, and that is the part that matters most. An earlier version of this post passed five arguments to a four-parameter constructor — the DIP example was lying about its own architecture.

The sales report by category, which opened this post, came in after that separation. It did not widen `InventoryRepositoryPort` nor touch `SyncOrchestrator`: it got its own read port, because querying and writing are different responsibilities.

```ts
// sales-report.ts
export interface CategorySales {
  category: string;
  units: number;
  revenue: number;
}

export interface SalesReportPort {
  byCategory(period: { from: Date; to: Date }): Promise<CategorySales[]>;
}

export class CategorySalesReport {
  constructor(private sales: SalesReportPort) {}

  async run(period: { from: Date; to: Date }): Promise<CategorySales[]> {
    const rows = await this.sales.byCategory(period);
    // Ordenar e paginar é responsabilidade do relatório, não do repositório.
    return rows.sort((a, b) => b.revenue - a.revenue);
  }
}
```

`InventoryRepositoryPort` stayed with a single method, `upsert`. The report talks to `SalesReportPort`, and the orchestrator does not even know that port exists. It was exactly the request that, in the monolithic version, would have cost a refactor.

---

## When **not** to apply SOLID

SOLID is a cost, and the cost has to justify itself. In the MVP of a small client, four classes and dependency injection to move 300 products can be more expensive to maintain than the hack they replace.

Signs that you are applying too much:

* **The class has a single method and is instantiated once.** The indirection costs more than the coupling it avoids.
* **You are creating an interface with a single implementer and no forecast of a second.** That is speculation, not design.
* **The diagram has more arrows than the original problem.** If the team cannot explain the structure in one sentence, it is too big.
* **No test requires the swap.** If you are never going to change the implementation, the abstraction did not pay for itself.

For most small CRMs and catalogs, one function, one repository, and an `if` per channel go further. Reserve the full structure for when the pain shows up — the pain is the signal, not the feeling that you "should have" done it.

---

## Conclusion

Applying SOLID is not about following abstract rules; it is about keeping agility to adapt to changing requirements without breaking existing code. A well-designed system lets you add new features or swap dependencies without rewriting the core.

### Practical takeaways

- Define a single entry point for each data flow; then extract the responsibilities into smaller units.
- Create interfaces that represent only what the consumer uses, and wait for the second implementer to exist before abstracting.
- Treat an exception as a sign of contract violation: if the subclass throws where the superclass guaranteed success, the fix is to move the restriction inside it.
- Inject dependencies through the constructor, and keep the composition layer as the only place that knows concrete implementations.
- Check that the example compiles before publishing. Contradiction between sections is what destroys the reader's trust the most.
- Do not apply any of this out of habit. When the problem is small, the simple solution is the correct one.

## Sources

- [SOLID Principles – Robert C. Martin](https://www.objectmentor.com/resources/articles/SOLID.pdf)
- [TypeScript Handbook – Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
- [Python abc – Abstract Base Classes](https://docs.python.org/3/library/abc.html)


## 📸 Cover image credit
- **Image:** [Laptop coding programs (Unsplash).jpg](https://commons.wikimedia.org/wiki/File%3ALaptop_coding_programs_%28Unsplash%29.jpg)
- **Author:** Tirza van Dijk tirzavandijk
- **License:** [CC0](https://creativecommons.org/publicdomain/zero/1.0/) · via Wikimedia Commons
