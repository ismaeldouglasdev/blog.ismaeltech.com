---
title: "Edge Functions com Cloudflare Workers: compute global sem servidor"
date: "2026-09-14"
category: "tutorial"
tags: ["edge", "cloudflare", "serverless", "workers"]
excerpt: "Edge Functions com Cloudflare Workers: compute global sem servidor."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-09-14-edge-functions-com-cloudflare-workers-compute-global-sem.jpg"
lang: "pt"
---


A arquitetura de aplicações web passou por uma transformação silenciosa nos últimos anos. O modelo tradicional de servidor único, onde você mantém uma máquina respondendo a requisições em uma localização geográfica específica, está dando lugar a algo fundamentalmente diferente: código que executa simultaneamente em centenas de pontos de presença ao redor do mundo, a poucos milissegundos de qualquer usuário. Essa mudança não é apenas evolutiva, é uma redefinição do que significa "distribuir" uma aplicação.

Cloudflare Workers representa uma das implementações mais maduras dessa visão. Lançado em 2017, o serviço permite executar código JavaScript, TypeScript e Rust em edge locations da Cloudflare, sem a necessidade de gerenciar servidores, configurar load balancers ou decidir em qual região fazer deploy. O Workers executa onde o usuário está, e essa simples mudança geográfica desbloqueia uma série de possibilidades arquiteturais que eram impraticáveis ou economicamente proibitivas com infraestrutura tradicional.

## O modelo edge e suas diferenças fundamentais

Para entender por que edge functions representam uma mudança significativa, precisamos primeiro examinar o modelo cloud tradicional e suas limitações inerentes. Quando você implanta uma aplicação em um provedor cloud convencional, algumas escolhas fundamentais precisam ser feitas: em quais regiões os servidores ficarão, como o tráfego será distribuído entre eles, e o que acontece quando a latência entre usuário e servidor afeta a experiência.

A maioria das aplicações web modernas segue um padrão que parece razoável no papel: o usuário faz uma requisição, ela viaja através da internet até um data center, é processada por um servidor que pode estar a milhares de quilômetros de distância, e então a resposta faz o caminho de volta. Para usuários próximos ao servidor, essa latência é imperceptível. Para aqueles do outro lado do mundo, cada requisição adiciona dezenas ou centenas de milissegundos ao tempo de resposta, criando uma experiência degradada que impacta diretamente métricas de negócio como taxa de conversão e engajamento.

A primeira tentativa de resolver esse problema foi a CDN tradicional, que cacheia conteúdo estático em edge locations e entrega aos usuários a partir do ponto mais próximo. Funciona bem para imagens, CSS, JavaScript e outros assets imutáveis, mas não resolve o problema de requisições dinâmicas que precisam de processamento. Se o seu endpoint de API verifica autenticação, consulta um banco de dados personalizado ou executa lógica de negócio, você ainda precisa de um servidor centralizado processando essas requisições.

Edge functions atacam precisamente essa limitação. Em vez de apenas cachear conteúdo, o edge location pode executar código arbitrário antes de decidir se a requisição precisa ir até o servidor de origem, se pode ser servida diretamente do cache, ou se pode ser transformada de alguma forma que beneficie o usuário final. O resultado é um modelo onde a lógica de negócio pode residir fisicamente perto de quem a consome, com latência medida em milissegundos de rede em vez de centenas.

## Primeiros passos com Cloudflare Workers

O Workers utiliza o padrão Service Worker como modelo de programação, o que significa que cada requisição que entra passa por um handler que você define. A API é deliberadamente minimalista: você define um listener para eventos de fetch, processa a requisição, e retorna uma resposta. Essa simplicidade esconde um sistema sofisticadamente projetado para inicialização instantânea e execução em ambientes isolados.

Para começar a desenvolver, você precisa instalar o Wrangler, a CLI oficial da Cloudflare para Workers. O Wrangler não é apenas uma ferramenta de deploy, é seu ambiente de desenvolvimento completo, permitindo criar novos projetos, testar localmente com miniflare, e fazer deploy com um único comando.

```bash
npm install -g wrangler
```

A configuração mais básica de um Worker cria um arquivo JavaScript que intercepta requisições HTTP e retorna uma resposta. O código a seguir implementa um endpoint que retorna o horário atual formatado, demonstrando a simplicidade do modelo:

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

Quando você faz deploy desse código com `npx wrangler deploy`, ele se torna disponível em uma URL que a Cloudflare distribui globalmente através de sua rede de pontos de presença. Não há configuração de regiões, load balancers ou auto-scaling. O código simplesmente existe em todos os locais da rede simultaneamente.

O sistema de routing do Workers permite definir padrões mais complexos diretamente no código. Para aplicações que precisam de múltiplos endpoints, você pode implementar um router simples ou utilizar uma biblioteca como Hono, que oferece uma API familiar para desenvolvedores que já trabalharam com frameworks como Express:

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
  // Processamento no edge
  return c.json({ status: 'processed', edge: 'cloudflare' });
});

export default app;
```

## Armazenamento persistente com KV e D1

Executar código no edge é apenas parte da equação. Aplicações úteis precisam de estado, e é aí que o ecossistema de storage da Cloudflare se diferencia. O Workers oferece múltiplos produtos de armazenamento, cada um otimizado para padrões de acesso diferentes.

Cloudflare KV é um armazenamento chave-valor (key-value) distribuído projetado para operações de leitura frequentes e baixa latência. Dados são automaticamente replicados para milhares de edge locations, permitindo leituras com latência de milissegundos independente de onde o usuário está. A consistência eventual significa que escritas podem levar alguns segundos para se propagar globalmente, mas leituras são extremamente rápidas.

KV funciona excepcionalmente bem para casos de uso como caches de alta velocidade, configuração de aplicações, session stores, e qualquer dado que precise ser lido frequentemente mas atualizado ocasionalmente. A implementação de um cache simples demonstra o padrão:

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
    
    // Cache por 1 hora
    ctx.waitUntil(
      cache.put(cacheKey, response.clone())
    );
    
    const headers = new Headers(response.headers);
    headers.set('X-Cache', 'MISS');
    return response;
  }
};
```

Para dados que requerem consultas relacionais, o D1 oferece um banco de dados SQLite distribuído. O D1 cria réplicas read-only em cada edge location, permitindo queries SQL com latência extremamente baixa para operações de leitura. Writes ainda precisam passar por uma região primária, mas o sistema de replicação garante que leituras sejam servidas localmente.

A criação de um banco D1 e suas primeiras tabelas são feitas via configuração:

```yaml
# wrangler.toml
name = "meu-app-edge"
compatibility_date = "2024-09-23"

[[d1_databases]]
binding = "DB"
database_name = "meu-banco"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === "/users") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM users WHERE active = ?"
      ).bind(1).all();
      
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    if (url.pathname === "/users" && request.method === "POST") {
      const data = await request.json();
      const { success } = await env.DB.prepare(
        "INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)"
      ).bind(data.name, data.email, new Date().toISOString()).run();
      
      return new Response(JSON.stringify({ success }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response("Not Found", { status: 404 });
  }
};
```

## Armazenamento de objetos com R2

O R2 é a oferta de object storage da Cloudflare, posicionado como alternativa ao S3 com uma diferença crucial: não há taxas de egress. Para aplicações que servem grande volume de arquivos para usuários globalmente, essa economia pode ser substancial. O R2 é compatível com a API S3, o que significa que bibliotecas clientes existentes funcionam sem modificações.

Um caso de uso comum no edge é servir imagens processadas. Você pode armazenar originais no R2 e usar Workers para redimensionar, comprimir ou converter formatos sob demanda:

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
    
    // Cache por 1 dia em edge, 1 mês no browser
    headers.set("Cache-Control", "public, max-age=86400");
    
    return new Response(object.body, { headers });
  }
};
```

## Automação com Cron Triggers

Workers não executam apenas em resposta a requisições HTTP. O sistema de Cron Triggers permite agendar execução periódica, habilitando padrões como sincronização de dados, limpeza de caches, geração de relatórios e tarefas de manutenção que tradicionalmente exigiriam um servidor dedicado ou container rodando 24/7.

A configuração de um cron job é declarativa no wrangler.toml:

```toml
name = "meu-worker-cron"
compatibility_date = "2024-09-23"

[triggers]
crons = ["0 */6 * * *", "0 9 * * 1"]  # A cada 6 horas, toda Segunda às 9h

[[d1_databases]]
binding = "DB"
database_name = "relatorios"
database_id = "xxxxx"
```

O handler recebe a informação de qual cron disparou através do schedule event:

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
  // Sincroniza dados de APIs externas
  const response = await fetch("https://api.external.com/sync");
  const data = await response.json();
  
  // Persiste no D1
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

## Inferência de IA no edge

Uma das adições mais interessantes ao Workers é a capacidade de executar modelos de machine learning diretamente no edge. O Workers AI oferece inferência para modelos como Llama 3, Mistral e Stable Diffusion, acessível através de uma API REST simples. Para casos de uso que não justificam infraestrutura própria de GPU, essa opção democratiza o acesso a capacidades de IA generativa.

A integração usa o binding AI disponível em todo Worker:

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (url.pathname === "/chat") {
      const { message } = await request.json();
      
      const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [
          { role: "system", content: "Você é um assistente útil." },
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

Para tarefas de processamento de texto como classificação, extração de entidades ou análise de sentimento, a latência típica é de centenas de milissegundos, viabilizando integrações em tempo real que seriam impraticáveis com chamadas para APIs centralizadas.

## Deploy e workflow de desenvolvimento

O Wrangler oferece um loop de desenvolvimento que elimina a fricção tradicional de deploy de infraestrutura. O comando `npx wrangler dev` inicia um servidor local que simula o ambiente edge, incluindo bindings para KV, D1 e outros serviços. Mudanças no código são recarregadas instantaneamente, permitindo iteração rápida sem ciclos de build e deploy.

Para ambientes de produção, o deploy é tão simples quanto:

```bash
npx wrangler deploy
```

O Wrangler automaticamente faz upload do código, configura rotas, e distribui para a rede global. O tempo total de deploy para código típico é de segundos, não minutos, permitindo pipelines de CI/CD que deployam dezenas de vezes por dia se necessário.

Variáveis de ambiente e secrets são gerenciados através do Wrangler, permitindo configurar diferentes valores por ambiente sem modificar código:

```bash
# desenvolvimento
npx wrangler secret put API_KEY --env development

# produção
npx wrangler secret put API_KEY --env production
```

O sistema de ambientes do Wrangler também permite configuração específica por ambiente no wrangler.toml, facilitando manter uma configuração que faz sentido para todos os estágios do desenvolvimento.

## Quando edge functions fazem sentido

Nem toda aplicação se beneficia de execução no edge. O padrão brilha em cenários específicos: APIs que servem usuários globalmente com requisitos de baixa latência, processamento de requisições que podem ser completadas sem acesso a recursos centralizados, e cargas de trabalho que variam significativamente em volume.

Aplicações com acesso frequente a bancos de dados transacionais pesados ainda se beneficiam mais de uma arquitetura híbrida, onde o edge trata autenticação, validação e cache agressivo enquanto requisições complexas vão para servidores centralizados. O Workers não substitui completamente servidores tradicionais, mas os torna menos necessários para uma categoria significativa de casos de uso.

A economia também é um fator de decisão válido. Para aplicações de baixo a médio tráfego, a camada gratuita do Workers cobre uma quantidade substancial de requisições, e mesmo acima desse limite os custos permanecem competitivos com alternativas serverless tradicionais. A ausência de taxas de egress no R2 especificamente pode representar economias significativas para aplicações que servem grande volume de dados.

## Takeaways práticos

- Cloudflare Workers executa código JavaScript, TypeScript ou Rust em edge locations globais sem gerenciamento de servidores, com latência medida em milissegundos
- KV oferece armazenamento chave-valor de alta velocidade para cache e configuração, enquanto D1 permite queries SQL com réplicas em cada edge location
- O R2 Storage elimina taxas de egress, sendo ideal para aplicações que servem grande volume de arquivos para usuários globalmente
- Cron Triggers permitem automação de tarefas periódicas sem infraestrutura dedicada, simplificando sincronização e manutenção
- Workers AI oferece inferência de modelos como Llama 3 diretamente no edge, viabilizando IA sem latência de rede
- O workflow de desenvolvimento com Wrangler é otimizado para iteração rápida, com `dev` local e `deploy` em segundos
- Edge functions são ideais para APIs globais, processamento de requisições independentes, e aplicações que priorizam latência; casos complexos de banco de dados se beneficiam de arquiteturas híbridas

## Fontes

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [Wrangler CLI GitHub Repository](https://github.com/cloudflare/wrangler)
## 📸 Crédito da imagem de capa
- **Imagem:** [EDGE Shadow 25 loitering munition.jpg](https://commons.wikimedia.org/wiki/File%3AEDGE_Shadow_25_loitering_munition.jpg)
- **Autor(a):** Unknown author
- **Licença:** [Public domain](https://en.wikipedia.org/wiki/Public_domain) · via Wikimedia Commons
