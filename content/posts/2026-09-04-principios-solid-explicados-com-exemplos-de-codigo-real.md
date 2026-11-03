---
title: "Princípios SOLID explicados com exemplos de código real"
date: "2026-09-04"
category: "article"
tags: ["solid", "arquitetura", "boas-praticas"]
excerpt: "Princípios SOLID explicados com código real: SRP, OCP, LSP, ISP e DIP aplicados a um caso de integração de e-commerce."
share_hook: "Cada princípio SOLID com o código antes e depois, a partir de uma integração que quebrou dois meses depois de entrega."
lang: "pt"
---

## Introdução

Imagine que um cliente solicita uma integração que sincroniza estoque com um marketplace. Você entrega o código, mas depois precisa adicionar um relatório de vendas por categoria. O que era um módulo simples agora está cheio de condições, métodos que fazem tudo e pouca margem para mudanças.

Aqui eu explico como os cinco princípios SOLID podem impedir que um código evolua para um monólito incontrolável. Cada princípio vem acompanhado de um exemplo em uma das duas linguagens que eu uso no dia a dia: TypeScript no serviço de sincronização e Python no motor de canais. No final eu junto os dois em um caso real, e também escrevo sobre **quando não vale a pena** aplicar nada disso.

> Este é o post longo da série. Se você quer a versão condensada, com os mesmos princípios em uma página, veja [Arquitetura limpa em TypeScript: princípios SOLID aplicados](https://blog.ismaeltech.com/2026-09-21-arquitetura-limpa-em-typescript-principios-solid-aplicados/). Lá o foco é estrutura de pastas e classes curtas; aqui é dependência, contrato e o que fazer quando o terceiro canal aparece.

---

## Single Responsibility Principle (SRP)

**Regra básica:** uma classe ou módulo deve ter apenas um motivo para mudar.

### Por que isso importa

Quando uma única classe cuida de leitura de API externa, transformação de dados e envio de e-mail, qualquer alteração em um desses domínios gera risco de regressão nos outros. Em uma primeira versão, todas essas responsabilidades ficavam misturadas. Mudar o formato do payload quebrava outras partes do código por causa de dependências cruzadas.

### Exemplo em TypeScript

Antes, tudo em uma classe só:

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

Quatro motivos para mudar numa classe só. A divisão fica assim, com cada pieza responsável por uma coisa:

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

Repare no que mudou: sobraram quatro unidades, e cada uma tem uma razão de existir separada. `ProductNormalizer` é pura e testável com um array literal, sem banco, rede nem mock. O SQL ficou preso ao repositório e o envio do alerta ficou preso ao notificador, então mexer em um dos quatro não toca os outros três.

---

## Open/Closed Principle (OCP)

**Regra básica:** módulos devem estar abertos para extensão, mas fechados para modificação.

### Por que isso importa

Quando é preciso acrescentar um novo canal de venda (Shopee). Cada vez que eu alterava o `SyncEngine` para incluir o novo cliente, o risco de quebrar a integração já funcionando com o Mercado Livre aumentava. Aplicar OCP significa que a estrutura existente permanece intacta e a nova funcionalidade chega como um módulo adicional.

### Exemplo em Python

Antes, o motor conhecia cada canal por nome — e cada canal novo exigia um `if` novo dentro dele:

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

Depois, o canal chega como módulo e o motor não é tocado:

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

A classe `SyncEngine` não conhece detalhes de nenhum canal. Quando surge um novo marketplace, basta implementar `ChannelAdapter` e registrar a instância na lista passada ao construtor — o laço de iteração não muda.

---

## Liskov Substitution Principle (LSP)

**Regra básica:** objetos de uma subclasse devem poder substituir objetos da superclasse sem alterar o comportamento esperado.

### Por que isso importa

O caso que mais me custou tempo foi o teto da Shopee. A API dela aceita **no máximo 50 itens por chamada**. A primeira versão do adapter fazia o seguinte, e isso é uma violação clássica de LSP:

```python
class ShopeeAdapter(ChannelAdapter):
    MAX_ITEMS = 50

    def push(self, items: List[StockItem]) -> None:
        if len(items) > self.MAX_ITEMS:
            raise ValueError("Shopee aceita no máximo 50 itens por chamada")
        # ...
```

O contrato `ChannelAdapter.push` aceita qualquer lista. `ShopeeAdapter` ajoutou uma **precondição mais forte**: um chamador que foi escrito contra o contrato e antes podia passar 10 mil itens de uma vez agora leva uma exceção ao receber um `ShopeeAdapter`. A subclasse é menos substitutível que a superclasse — exatamente o oposto do que LSP pede.

A correção é mover a responsabilidade para dentro do adapter, em vez de despejá-la no chamador:

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

Agora quem chama `push` não sabe que existe limite de 50. O mesmo código do `SyncEngine` funciona com um lote de 10 itens ou de 10 mil, e com qualquer outro adapter. A restrição da Shopee continua existindo, mas virou detalhe de implementação.

Esse é o ponto que costuma passar batido: **o que não pode quebrar é o comportamento que o cliente já esperava.** Uma subclasse que lança exceção onde a superclasse garantia sucesso não é substitutível, por mais bem documentada que esteja.

---

## Interface Segregation Principle (ISP)

**Regra básica:** clientes não devem ser forçados a depender de interfaces que não utilizam.

### Por que isso importa

Quando uma interface define muitos métodos obrigatórios, classes que só precisam de parte deles acabam implementando métodos vazios. Isso infla a interface e o código sem agregar valor.

### Exemplo em Python

O problema não é a quantidade de métodos, é o **cliente**. Antes, um único contrato para tudo:

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

Depois, contratos separados por consumidor:

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

Ninguém implementa o que não usa: `LocalOllamaProvider` não tem `get_latency` nem `alert`, e `PagerDutyNotifier` não tem `ping` nem `get_latency`. O `watch` declara que só precisa de `ping`, então nunca importa `LatencyMeasurable`. A segregação é do lado do cliente: cada consumidor declara o mínimo que usa.

---

## Dependency Inversion Principle (DIP)

**Regra básica:** módulos de alto nível não devem depender de módulos de baixo nível; ambos devem depender de abstrações.

### Por que isso importa

Conectar o código de negócio diretamente a um driver específico cria um acoplamento forte. Quando é preciso trocar o banco, toda a lógica de negócio fica presa ao driver. DIP existe para inverter essa dependência e permitir trocar a implementação sem tocar nas regras de negócio.

### Exemplo em TypeScript

Primeiro, os tipos de domínio e as abstrações:

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

Depois, as implementações — cada uma escondendo o seu driver:

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

E o serviço de negócio, que enxerga **apenas** a interface:

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

Trocar de banco é uma linha na camada de composição. Nenhuma linha de `LeadEnrichmentService` muda, e o serviço nem sabe qual driver está do outro lado.

---

## Todos os princípios juntos em um caso real

### Contexto

Um caso comum é sincronizar catálogo e estoque com múltiplos marketplaces sem que cada novo canal vire uma reescrita completa do sistema.

### Arquitetura final

São dois processos, e a separação é deliberada — o ingest e o fan-out para canais têm ciclos de falha diferentes:

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

Os papéis de cada princípio nesse desenho:

* **SRP** — buscar, normalizar, persistir, notificar e publicar são cinco responsabilidades, em cinco unidades. O `SyncEngine` itera adapters; ele não sabe o que é um produto.
* **OCP** — acrescentar canal é escrever um adapter novo e registrá-lo na lista. O `SyncEngine` e o `SyncOrchestrator` não são tocados.
* **LSP** — todos os adapters honram o mesmo contrato: quem chama `push` entrega um lote e não conhece o teto de 50 itens da Shopee. A restrição mora dentro do adapter.
* **ISP** — o `SyncOrchestrator` consome `Notifier`, e só isso. É a mesma ideia do exemplo do Python acima: cada consumidor declara o mínimo que usa, e um notificador que só envia mensagem não é obrigado a implementar métricas.
* **DIP** — o `SyncOrchestrator` depende de quatro *ports* (`ProductFetcher`, `ProductNormalizerPort`, `InventoryRepositoryPort`, `Notifier`); o `SyncEngine` depende de `ChannelAdapter`. Nenhum dos dois importa a implementação concreta do outro lado.

### Código de composição (TypeScript)

Os ports declarados onde o orquestrador é definido:

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

E a camada que escolhe as implementações — o único lugar do sistema que conhece classes concretas:

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

Quatro argumentos, quatro parâmetros: o código compila, e essa é a parte que mais importa. Uma versão anterior deste post passava cinco argumentos para um construtor de quatro — o exemplo de DIP estava mentindo sobre a própria arquitetura.

O relatório de vendas por categoria, que abriu este post, entrou depois dessa separação. Ele não ampliou `InventoryRepositoryPort` nem tocou em `SyncOrchestrator`: ganhou a própria porta de leitura, porque consulta e escrita são responsabilidades diferentes.

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

`InventoryRepositoryPort` continuou com um único método, `upsert`. O relatório conversa com `SalesReportPort`, e o orquestrador nem sabe que essa porta existe. Era exatamente o pedido que, na versão monolítica, teria custado uma refatoração.

---

## Quando **não** aplicar SOLID

SOLID é um custo, e o custo precisa se justificar. No MVP de um cliente pequeno, quatro classes e injeção de dependência para mover 300 produtos podem ser mais caro de manter do que a gambiarra que elas substituem.

Sinais de que você está aplicando demais:

* **A classe tem um método só e é instanciada uma vez.** A indireção custa mais do que o acoplamento que ela evita.
* **Você está criando interface com um único implementador e nenhuma previsão de segundo.** Isso é especulação, não design.
* **O diagrama tem mais setas do que o problema original.** Se o time não consegue explicar a estrutura numa frase, ela está grande demais.
* **Nenhum teste exige a troca.** Se você nunca vai trocar a implementação, a abstração não pagou o custo.

Para a maioria dos CRMs e catálogos pequenos, uma função, um repositório e um `if` por canal chegam mais longe. Reserve a estrutura completa para quando a dor aparecer — a dor é o sinal, não a sensação de que "deveria ter".

---

## Conclusão

Aplicar SOLID não é seguir regras abstratas; é manter a agilidade para adicionar funcionalidades sem quebrar o que já funciona. Um bom design permite adicionar um novo canal, um novo relatório ou trocar uma dependência sem reescrever o núcleo.

### Takeaways práticos

- Defina um ponto de entrada único para cada fluxo de dados; depois extraia as responsabilidades em unidades menores.
- Crie interfaces que representem apenas o que o consumidor usa, e espere o segundo implementador existir antes de abstragir.
- Trate exceção como sinal de violação de contrato: se a subclasse lança onde a superclasse garantia sucesso, a correção é mover a restrição para dentro dela.
- Injete dependências por construtor, e mantenha a camada de composição como o único lugar que conhece implementações concretas.
- Verifique se o exemplo compila antes de publicar. Contradição entre seções é o que mais destrói a confiança de quem lê.
- Não aplique nada disso por hábito. Quando o problema é pequeno, a solução simples é a correta.

## Fontes

- [SOLID Principles – Robert C. Martin](https://www.objectmentor.com/resources/articles/SOLID.pdf)
- [TypeScript Handbook – Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
- [Python abc – Abstract Base Classes](https://docs.python.org/3/library/abc.html)


## 📸 Crédito da imagem de capa
- **Imagem:** [Laptop coding programs (Unsplash).jpg](https://commons.wikimedia.org/wiki/File%3ALaptop_coding_programs_%28Unsplash%29.jpg)
- **Autor(a):** Tirza van Dijk tirzavandijk
- **Licença:** [CC0](https://creativecommons.org/publicdomain/zero/1.0/) · via Wikimedia Commons
