---
title: "React Server Components: quando e como usar no Next.js"
date: "2026-10-01"
category: "tutorial"
tags: ["react", "server-components", "nextjs"]
excerpt: "React Server Components: quando e como usar no Next.js."
cover:
  image: "/covers/2026-10-01-react-server-components-quando-e-como-usar-no-next-js.jpg"
comments: true
translationKey: "2026-10-01-react-server-components-quando-e-como-usar-no-next-js"
---

# React Server Components: quando e como usar no Next.js

O Next.js introduziu os React Server Components (RSC) na versão 13, e desde então a maneira como pensamos em construir aplicações React mudou radicalmente. A pergunta que recebo com frequência é simples: "Quando exatamente eu devo usar server components?" A resposta curta é que depende do que você está construindo, mas a resposta longa exige entender por que essa arquitetura existe e quais problemas ela resolve de fato.

Se você, como eu, veio de umbackground onde o React significava Client-Side Rendering (CSR) puro â componente renderiza no browser, busca dados via useEffect, gerencia estado com Redux ou Context â a migração para server components exige uma mudança de mentalidade que vai além da sintaxe. Não é só sobre colocar "use client" em alguns arquivos; é sobre repensar o fluxo de dados da sua aplicação inteira.

## A evolução do rendering no React

Para entender os server components, precisamos olhar para o caminho que o React percorreu. No início, tínhamos o clássico CSR: o browser baixa um HTML vazio, baixa o bundle JavaScript, hydrate o React, e só então a aplicação ganhavam vida. Funcionava, mas tinha custos em performance, especialmente em dispositivos mais modestos e conexões mais lentas.

O Next.js surgiu com a ideia de Server-Side Rendering (SSR): o React era executado no servidor, o HTML era enviado pronto para o browser. Isso melhorou significativamente o First Contentful Paint (FCP) e o SEO, mas trouxe o problema de hydration: você mandava HTML gerado no servidor, e o browser tinha que re-executar toda a lógica do React para fazer aé¡µé¢ interativa. Se você tem uma dashboard complexa com muito JavaScript, isso vira um gargalo.

Os Server Components representam uma terceira via: componentes que executam exclusivamente no servidor e não enviam JavaScript para o browser. Eles podem acessar recursos do servidor (banco de dados, sistema de arquivos, APIs internas) e retornam HTML diretamente, sem hydration. O browser recebe apenas o resultado final.

## Server Components versus Client Components: as diferenças práticas

A distinção fundamental entre server e client components está no ciclo de vida e no que cada um pode fazer.


<figure>
<img src="/media/2026-10-01-react-server-components-quando-e-como-usar-no-next-js-1.jpg" alt="React Server Components: quando e como usar no Next.js" loading="lazy">
<figcaption>Subsequent secure socket layers (SSL and TLS), implemented several years later using the architecture and key ideas first presented in SNP, enabled secure e-com. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3A2004_ACM_Software_System_Award_Certificate.jpg">2004 ACM Software System Award Certificate.jpg</a> por Ssl-wiki2021 — <a href="http://creativecommons.org/publicdomain/zero/1.0/deed.en">CC0</a> · via Wikimedia Commons</figcaption>
</figure>

<figure>
<img src="/covers/2026-10-01-react-server-components-quando-e-como-usar-no-next-js.jpg" alt="React Server Components: quando e como usar no Next.js" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>

Client components são os React que você conhece: podem usar hooks (useState, useEffect, useContext), gerenciar estado de interação do usuário, e executam inteiramente no browser. Eles são enviados como parte do JavaScript bundle e o React faz hydration para torná-los interativos. Quando você escreve um componente que responde a eventos de clique, digitação, ou qualquer outra interação, precisa ser um client component.

Server components operam de maneira completamente diferente. Eles não podem usar hooks de estado ou efeitos porque não existem no browser â eles executam no servidor durante a renderização e produzem HTML que é enviado ao cliente. A implicação prática é que você pode importar modules diretamente do servidor (conexões de banco, utilitários de sistema de arquivos) sem expô-los ao browser. É como ter uma função que roda no backend mas pode ser usada na sua UI como se fosse um componente qualquer.

```tsx
// Exemplo de client component
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-4 border rounded">
      <p>Contagem: {count}</p>
      <button 
        onClick={() => setCount(c => c + 1)}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Incrementar
      </button>
    </div>
  );
}
```

```tsx
// Exemplo de server component
import { db } from '@/lib/db';

export async function UserProfile({ userId }: { userId: string }) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, posts: true }
  });

  if (!user) return <p>Usuário não encontrado</p>;

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <span className="posts-count">
        {user.posts.length} posts publicados
      </span>
    </div>
  );
}
```

O segundo exemplo faz uma query direta no banco de dados dentro do componente. Em uma arquitetura tradicional, isso seria impensável â você precisaria de uma API REST ou GraphQL, um endpoint no backend, e o componente pediria os dados via useEffect. Com server components, a query roda no servidor e o HTML chega pronto no browser.

## Quando usar cada tipo de componente

A regra geral que eu sigo é simples: comece com server components e adicione 'use client' apenas quando precisar de interatividade. Parece óbdito, mas muita gente inverte a lógica.

Server components são ideais para conteúdo estático ou que muda raramente, componentes que apenas exibem dados (listas, perfis, feeds), partes da UI que não dependem de eventos do usuário, e qualquer lógica que precise acessar recursos do servidor. Se você está construindo uma landing page, um blog post, uma lista de produtos â tudo isso naturalmente tende a ser server components.

Client components justificam-se quando você precisa de useState, useEffect, ou qualquer hook do React, quando tem handlers de eventos (onClick, onChange, onSubmit), quando usa Context API, ou quando o componente precisa ser interativo de alguma forma. Buttons, forms, modals, carrosséis, accordions â esses são client components.

O ponto que causa mais confusão é o mix: você pode ter client components que renderizam server components dentro deles. A estrutura usual é um server component pai que busca dados e renderiza client components que cuidam da interação. O server component já entrega HTML com os dados preenchidos, e o client component só precisa "pegar vida" para responder a cliques e estados.

```tsx
// page.tsx - Server Component (page é server por padrão)
import { ProductList } from '@/components/ProductList';
import { getProducts } from '@/lib/products';

export default async function ShopPage() {
  const products = await getProducts();
  
  return (
    <main>
      <h1>Nossa Loja</h1>
      <ProductList initialProducts={products} />
    </main>
  );
}
```

```tsx
// ProductList.tsx - Client Component
'use client';

import { useState } from 'react';
import { ProductCard } from './ProductCard';

export function ProductList({ initialProducts }: { initialProducts: Product[] }) {
  const [sortBy, setSortBy] = useState<'price' | 'name'>('price');
  const [products, setProducts] = useState(initialProducts);
  
  const sorted = [...products].sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setSortBy('price')}>Por Preço</button>
        <button onClick={() => setSortBy('name')}>Por Nome</button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {sorted.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
```

Neste padrão, a page busca os dados no servidor e passa como prop inicial para o client component. O HTML chega com os produtos já renderizados, e a interatividade de ordenação funciona imediatamente. O usuário não vê um loading spinner enquanto os produtos carregam â eles já estão lá.

## Data fetching server-side: patterns que funcionam

A forma de buscar dados em server components é surpreendentemente simples: você pode usar async/await diretamente no corpo do componente. Não precisa de useEffect, loading states complexos, ou tratamento de erros em múltiplas camadas.


O Next.js trata a função assíncrona como uma promise e automaticamente envolve o componente em Suspense enquanto os dados carregam. Isso permite que você pense em data fetching como algo serializado: primeiro o header carrega, depois o conteúdo principal, e o browser já pode mostrar algo enquanto espera.

```tsx
// app/posts/[slug]/page.tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { cache } from '@/lib/cache';

const getPost = cache(async (slug: string) => {
  const res = await fetch(`https://api.example.com/posts/${slug}`);
  if (!res.ok) return null;
  return res.json();
});

const getComments = cache(async (postId: string) => {
  const res = await fetch(`https://api.example.com/posts/${postId}/comments`);
  return res.json();
});

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  
  if (!post) notFound();

  return (
    <article>
      <header>
        <h1>{post.title}</h1>
        <p className="meta">{post.author} â¢ {post.date}</p>
      </header>
      
      <div className="content">{post.content}</div>
      
      <section className="comments">
        <h2>Comentários</h2>
        <Suspense fallback={<p>Carregando comentários...</p>}>
          <CommentsSection postId={post.id} />
        </Suspense>
      </section>
    </article>
  );
}

async function CommentsSection({ postId }: { postId: string }) {
  const comments = await getComments(postId);
  
  return (
    <ul>
      {comments.map((c: any) => (
        <li key={c.id}>
          <strong>{c.author}</strong>: {c.text}
        </li>
      ))}
    </ul>
  );
}
```

Há alguns pontos importantes aqui. O uso de cache é essencial porque server components podem ser executados múltiplas vezes durante uma requisição ou em requisições subsequentes. A função cache evita queries duplicadas ao banco ou API. O Suspense permite loading states granulares: cada seção pode ter seu próprio skeleton enquanto carrega, e o Next.js consegue fazer streaming progressivo do HTML.

O fallback do Suspense é importante para a percepção de performance. Se você tem uma página com dados lentos, mostrar algo imediato (mesmo que seja "Carregando...") é melhor do que uma tela em branco. O Next.js consegue mandar o HTML das partes rápidas primeiro e fazer streaming das partes lentas conforme terminam.

## Streaming e Suspense: performance progressiva

O streaming é uma das features mais poderosas dos server components e frequentemente ignorada. Quando você marca um componente com Suspense, o Next.js pode começar a enviar HTML para o browser antes de terminar toda a renderização. O browser recebe pacotes de HTML conforme ficam prontos, o que significa que o usuário começa a ver conteúdo mais cedo.

Na prática, isso vira um layout que aparece gradualmente: header e sidebar carregam primeiro, depois o conteúdo principal, e por último widgets secundários. O First Contentful Paint melhora drasticamente, e a experiência parece mais fluida porque algo aparece na tela quase que imediatamente.

```tsx
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  return (
    <div className="dashboard">
      <header>...</header>
      
      <div className="main">
        <Suspense fallback={<Skeleton className="h-64" />}>
          <RevenueChart />
        </Suspense>
        
        <Suspense fallback={<Skeleton className="h-32" />}>
          <RecentSales />
        </Suspense>
      </div>
      
      <aside>
        <Suspense fallback={<Skeleton className="h-48" />}>
          <Notifications />
        </Suspense>
      </aside>
    </div>
  );
}
```

Cada Suspense define um fallback que é mostrado enquanto o componente correspondente carrega. O Next.js determina a ordem de streaming baseada na profundidade da árvore de componentes e no que está disponível mais rápido. Não é mágico â você ainda precisa otimizar suas queries â mas muda completamente a experiência do usuário.

O uso de streaming é particularmente efetivo quando você tem dados de fontes diferentes com latências distintas. Um widget que depende de uma API externa lenta não precisa bloquear a página inteira; ele carrega no próprio ritmo enquanto o resto da UI já está interativa.

## Forms com Server Actions

Antes dos Server Actions, formulários em React eram client-side only: você capturava o submit, evitava o comportamento padrão, fazia fetch manualmente, e tratava o estado de loading e erro. Server Actions mudam isso radicalmente: você pode chamar funções no servidor diretamente do HTML, com fallback graceful para JavaScript desabilitado.

```tsx
// app/actions.ts
'use server';

export async function createUser(formData: FormData) {
  const name = formData.get('name');
  const email = formData.get('email');
  
  if (!name || !email) {
    return { error: 'Nome e email são obrigatórios' };
  }
  
  try {
    await db.user.create({
      data: { name: String(name), email: String(email) }
    });
    return { success: true };
  } catch (e) {
    return { error: 'Falha ao criar usuário' };
  }
}
```

```tsx
// app/users/new/page.tsx
import { createUser } from '@/app/actions';

export default function NewUserPage() {
  return (
    <form action={createUser} className="max-w-md">
      <div>
        <label htmlFor="name">Nome</label>
        <input type="text" id="name" name="name" required />
      </div>
      
      <div>
        <label htmlFor="email">Email</label>
        <input type="email" id="email" name="email" required />
      </div>
      
      <button type="submit">Criar Usuário</button>
    </form>
  );
}
```

O form funciona mesmo sem JavaScript no browser. Quando JS carrega, o Next.js "hydrata" o form e passa a usar fetch internamente, dando a experiência de SPA. Você pode adicionar estados de loading e erro usando useFormState (antigo useActionState no React 19):

```tsx
'use client';

import { useFormState } from 'react-dom';
import { createUser } from '@/app/actions';

const initialState = { error: null, success: false };

export function UserForm() {
  const [state, formAction] = useFormState(createUser, initialState);

  return (
    <form action={formAction}>
      <input type="text" name="name" />
      <input type="email" name="email" />
      
      {state.error && <p className="error">{state.error}</p>}
      {state.success && <p className="success">Usuário criado!</p>}
      
      <button type="submit">Enviar</button>
    </form>
  );
}
```

A combinação de server actions com server components é particularmente produtiva. Você pode ter uma página que mostra um formulário e também lista os registros existentes â ambos server components â e o form action que cria novos registros redireciona de volta para a mesma página, que é revalidada automaticamente.

## Considerações de performance

Server components eliminam JavaScript do bundle, mas isso não significa que toda a sua aplicação deve ser server components. A performance é sobre tradeoffs, e entender esses tradeoffs é essencial.

O principal benefício dos server components é a redução do bundle JavaScript. Se você tem uma página com many componentes que apenas exibem dados (tabelas, listas, cards de informação), esses componentes não adicionam nada ao bundle quando são server components. O HTML chega pronto e interativo na medida do possível.

Client components hydratan e ficam interativos, mas o React precisa processar a árvore de componentes. Se você tem componentes aninhados demais com useEffect e estado local, a hydration pode ficar pesada. Server components evitam isso completamente para as partes que não precisam de estado.

O gargalo muda de lugar: em vez de se preocupar com o tamanho do bundle JavaScript, você precisa se preocupar com a latência do servidor. Queries lentas no banco, APIs externas com alto latency, operações síncronas pesadas â tudo isso bloqueia a renderização server-side e pode deixar o usuário esperando mais do que esperaria com CSR tradicional.

O cache é crítico. O Next.js cacheia builds por padrão, então páginas estáticas são servidas instantaneamente. Quando você tem dados que mudam frequentemente, precisa de estratégias de revalidação: Time-Based Revalidation (revalidar a cada N segundos), On-Demand Revalidation (revalidar após criar/atualizar dados), ou API Route que você chama manualmente.

```tsx
// Revalidação a cada hora
export const revalidate = 3600;

// Ou revalidação sob demanda
import { revalidatePath } from 'next/cache';

revalidatePath('/produtos');
revalidatePath('/produtos/[id]', 'page');
```

## Conclusão

React Server Components não substituem client components â eles complementam. A arquitetura ideal é um mix onde o servidor cuida de buscar dados e renderizar UI estática, e o cliente adiciona interatividade onde necessário. É um modelo que funciona bem para desde landing pages até dashboards complexos.

A migração de uma aplicação CSR existente para server components exige planejamento. Você não precisa migrar tudo de uma vez; pode começar com páginas novas ou components específicos. A chave é identificar o que é conteúdo (server) e o que é interação (client) e arquitetar de acordo.

---

## Fontes

- [React Docs: Server Components](https://react.dev/reference/react/rsc)
- [Next.js Docs: Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js Docs: Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [React Docs: Suspense](https://react.dev/reference/react/Suspense)
- [Next.js Docs: Caching](https://nextjs.org/docs/app/building-your-application/caching)

---

## Takeaways Práticos

- Comece seus componentes como server components e adicione 'use client' apenas quando precisar de interatividade (hooks, event handlers)
- Use Suspense para criar loading states granulares e melhorar a percepção de performance
- Server Actions são ideais para formulários que precisam criar ou atualizar dados no servidor
- Implemente cache e revalidação estratégicos para cada rota baseada na frequência de mudança dos dados
- Não abandone client components â eles ainda são necessários para interatividade, mas server components devem ser a base da sua UI