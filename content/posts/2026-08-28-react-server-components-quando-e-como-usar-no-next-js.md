---
title: "React Server Components: quando e como usar no Next.js"
date: "2026-08-28"
category: "tutorial"
tags: ["react", "server-components", "nextjs"]
excerpt: "React Server Components permitem renderizar componentes no servidor, reduzindo o bundle no cliente. Saiba como o Next.js mudou a arquitetura frontend com essa abordagem."
share_hook: "Server ou Client Component, data fetching no servidor, streaming com Suspense e Server Actions — e quando cada um é a escolha certa."
lang: "pt"
---

O ecossistema frontend passou anos focado em rodar tudo no navegador do cliente, mas a arquitetura moderna de frameworks como o Next.js mudou o jogo ao trazer o servidor de volta para o centro das decisões de renderização. 

Quando comecei a construir meus próprios projetos e a estruturar interfaces com React, a divisão entre o que roda no servidor e o que roda no cliente parecia um detalhe de implementação secundário. Na prática, entender essa fronteira define se sua aplicação vai carregar instantaneamente ou se vai engasgar em dispositivos móveis mais modestos.


<figure>
  <img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-08-28-react-server-components-quando-e-como-usar-no-next-js.jpg" alt="O logo do React: componentes que rodam tanto no servidor quanto no cliente." loading="lazy" />
  <figcaption>
    O logo do React: componentes que rodam tanto no servidor quanto no cliente. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AReact.svg">React.svg</a> por ReactJS —
    <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a> · via Wikimedia Commons
  </figcaption>
</figure>

## Server vs Client Components

A premissa básica dos React Server Components, ou RSC, é que o código executado no servidor nunca chega ao navegador do usuário final. Isso significa que dependências pesadas de banco de dados, lógica de negócio sensível e chamadas diretas a APIs podem viver no servidor sem inflar o pacote JavaScript enviado ao cliente.

No Next.js, por padrão, todos os componentes dentro da pasta app são Server Components. Eles renderizam no servidor, geram HTML estático ou dinâmico e enviam apenas o resultado final para o navegador. 

Os Client Components, por sua vez, precisam ser explicitamente sinalizados com a diretiva 'use client' no topo do arquivo. Eles continuam rodando no servidor durante a renderização inicial para gerar o HTML estático de suporte, mas também são executados no navegador para gerenciar interatividade, estado local e efeitos colaterais.

O erro comum é tentar tratar o 'use client' como um botão de atalho para resolver problemas de importação. Quando um Client Component é declarado, toda a árvore de componentes importada por ele também passa a fazer parte do pacote enviado ao navegador.

## Quando usar cada um

A regra prática para decidir entre Server e Client Components baseia-se na necessidade de interatividade e acesso a recursos do navegador.

Server Components devem ser a escolha padrão para a maior parte da aplicação. Eles entram em cena quando você precisa buscar dados diretamente de um banco de dados, manter chaves de API ocultas do cliente, reduzir o tamanho do pacote JavaScript ou renderizar conteúdos estáticos e textuais pesados.

Client Components entram quando a interface exige interatividade direta. Isso inclui o uso de ganchos de estado como useState e useEffect, gerenciamento de eventos de clique ou teclado, uso de APIs do navegador como localStorage ou geolocalização, e bibliotecas de terceiros que dependem de componentes visuais baseados no DOM.

Em sistemas que desenvolvo, como painéis de controle ou ferramentas de gerenciamento de tarefas, a maior parte da estrutura de layout, tabelas estáticas de dados e requisições iniciais fica no servidor. Apenas pequenos blocos de formulários dinâmicos e botões de ação recebem a diretiva de cliente.

## Data fetching server-side

A busca de dados em Server Components elimina a necessidade de estados de carregamento manuais complexos com useEffect e bibliotecas externas de cache no lado do cliente para dados estáticos ou dinâmicos iniciais.

Como o componente roda no servidor, a consulta ao banco de dados ou a chamada fetch pode ser feita de forma direta.

```tsx
import db from '@/lib/db';

async function ProductList() {
  const products = await db.query('SELECT id, name, price FROM products');

  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          {product.name} - R$ {product.price}
        </li>
      ))}
    </ul>
  );
}

export default ProductList;
```

Neste exemplo, o código SQL ou a requisição HTTP acontece diretamente no servidor. O cliente recebe apenas a lista HTML pronta. Nenhum dado sensível de conexão vaza para o navegador e o volume de JavaScript despachado diminui drasticamente.

## Streaming e Suspense

Os Server Components introduzem uma vantagem considerável na entrega de conteúdo através do streaming baseado em partes. Em vez de esperar o servidor processar toda a página antes de enviar qualquer byte ao navegador, o Next.js consegue enviar o HTML em pedaços conforme os dados ficam prontos.

O uso do componente Suspense permite isolar partes lentas da aplicação sem travar o carregamento do layout principal.

```tsx
import { Suspense } from 'react';
import SlowAnalytics from '@/components/SlowAnalytics';
import SkeletonLoader from '@/components/SkeletonLoader';

export default function DashboardPage() {
  return (
    <main>
      <h1>Painel Principal</h1>
      <p>Dados gerais carregados instantaneamente.</p>
      
      <Suspense fallback={<SkeletonLoader />}>
        <SlowAnalytics />
      </Suspense>
    </main>
  );
}
```

O cabeçalho e o texto estático aparecem imediatamente para o usuário. Enquanto isso, o componente SlowAnalytics busca dados pesados no backend e é inserido na tela assim que o processamento termina.

## Forms com Server Actions

As Server Actions permitem executar funções assíncronas diretamente no servidor disparadas a partir de elementos de formulário no cliente, reduzindo a necessidade de criar rotas de API dedicadas para operações simples de escrita de dados.

```tsx
// app/actions.ts
'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createItem(formData: FormData) {
  const name = formData.get('name');
  
  if (!name) return;

  await db.query('INSERT INTO items (name) VALUES (?)', [name]);
  revalidatePath('/items');
}
```

No componente visual, a ação é passada diretamente para a propriedade action do formulário.

```tsx
import { createItem } from './actions';

export default function ItemForm() {
  return (
    <form action={createItem}>
      <input type="text" name="name" placeholder="Novo item..." required />
      <button type="submit">Salvar</button>
    </form>
  );
}
```

Essa abordagem simplifica a arquitetura do código. O gerenciamento de estado de envio pode ser complementado com o gancho useFormStatus para desabilitar o botão durante o processamento, mantendo a experiência fluida sem exigir uma biblioteca pesada de gerenciamento de formulários.

## Performance

Adotar Server Components afeta diretamente métricas cruciais de desempenho, especialmente o Largest Contentful Paint e o Total Blocking Time. 

Como grande parte do trabalho de renderização e análise de sintaxe ocorre no servidor, o navegador do usuário gasta menos tempo executando scripts de inicialização. Isso é perceptível em dispositivos móveis e computadores de entrada, que sofrem menos com o travamento da thread principal durante o carregamento de aplicações densas.

Manter o ecossistema limpo, evitando o uso desnecessário de 'use client', garante que o pacote final entregue ao cliente contenha apenas o estritamente necessário para a interação.

## Conclusão

O modelo de Server Components no Next.js exige uma mudança de mentalidade na forma de projetar aplicações web. Separar o que é estático do que é interativo deixa o código mais limpo, melhora o desempenho geral e simplifica o fluxo de dados.

- Use Server Components como padrão para busca de dados e renderização estrutural.
- Reserve a diretiva 'use client' estritamente para locais que exigem interatividade ou APIs do navegador.
- Aproveite o Suspense para melhorar a percepção de velocidade com carregamento em partes.
- Utilize Server Actions para simplificar mutações de dados sem criar rotas de API desnecessárias.

## Fontes

- [Next.js Documentation: Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [React Documentation: Server Components](https://react.dev/reference/react/components)
- [Next.js Documentation: Server Actions and Mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
## 📸 Crédito da imagem de capa
- **Imagem:** [BalticServers data center.jpg](https://commons.wikimedia.org/wiki/File%3ABalticServers_data_center.jpg)
- **Autor(a):** BalticServers.com
- **Licença:** [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · via Wikimedia Commons
