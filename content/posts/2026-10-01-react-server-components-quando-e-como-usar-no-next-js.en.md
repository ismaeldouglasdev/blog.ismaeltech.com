---
title: "React Server Components: When and How to Use in Next.js"
date: "2026-10-01"
category: "tutorial"
tags: ["react", "server-components", "nextjs"]
excerpt: "React Server Components: when and how to use in Next.js."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-10-01-react-server-components-quando-e-como-usar-no-next-js.jpg"
comments: true
translationKey: "2026-10-01-react-server-components-quando-e-como-usar-no-next-js"
---

# React Server Components: when and how to use in Next.js

Next.js introduced React Server Components (RSC) in version 13, and since then the way we think about building React applications has changed radically. The question I get asked frequently is simple: "When exactly should I use server components?" The short answer is that it depends on what you are building, but the long answer requires understanding why this architecture exists and which problems it actually solves.

If you, like me, came from a background where React meant pure Client-Side Rendering (CSR) â component renders in the browser, fetches data via useEffect, manages state with Redux or Context â the migration to server components requires a mindset shift that goes beyond syntax. It is not just about adding "use client" to some files; it is about rethinking the data flow of your entire application.

The fundamental question to ask yourself is not "where do I put this component?" but "what does my application actually need?" This question changes everything because the answer will dictate not only the rendering strategy but also how you think about fetching, caching, state management, and even team collaboration.

The original motivation behind server components was deeply practical. If you look at the problems the React team was trying to solve, the main pain points were bundle size, data fetching complexity, and the waterfall effect. In a typical Next.js application with many client components, the browser has to download, parse, and execute a significant amount of JavaScript before the page becomes interactive. This directly affects Core Web Vitals metrics like Largest Contentful Paint and Time to Interactive. Server components solve this by rendering components on the server and sending only HTML and the necessary client-side interactivity to the browser.

But the story does not end there. Server components introduced a new mental model that goes beyond performance optimization. We now have a spectrum of component types: server components that run exclusively on the server, client components that run in the browser, and shared components that can work in both contexts. Understanding where each component belongs in this spectrum is crucial for building efficient applications. A server component cannot use hooks like useState or useEffect because those are browser APIs, but it can read directly from the file system or query a database without needing an API layer in between.

In practice, server components are an excellent choice for pages with a lot of static content, dashboards that aggregate data from multiple sources, components that need direct database access, and any scenario where reducing client bundle size improves user experience. On the other hand, client components are necessary when you need user interaction, browser APIs, or client-side state that must persist across sessions.

To give a concrete example, imagine you are building a dashboard with multiple widgets that fetch data from different services. In the old approach, you would have each widget making its own API call from the client, often causing multiple round trips and loading spinners. With server components, you can fetch all that data on the server, render the widgets with the data already available, and send a complete page to the browser. The user sees the content immediately without waiting for client-side JavaScript to execute.

Another common scenario is authentication and authorization. In server components, you can check user sessions and permissions on the server and render different content based on the result. This is more secure than sending all the data to the client and hiding it with CSS because the sensitive data never leaves the server in the first place.

So when should you actually use server components? The honest answer is that you should use them when they solve a real problem in your application. If you are building a marketing page with mostly static content, server components will give you great performance out of the box. If you are building a highly interactive application with complex client state, you will still need many client components. The key is to analyze your specific use case and choose the right tool for the job.

My recommendation is to start with a server-first approach by default and move functionality to client components only when necessary. This is the opposite of the old pattern where we added server rendering as an optimization layer on top of a client-side application. By defaulting to server components, you get better performance, simpler data fetching, and improved security without extra effort.

To implement this in your Next.js project, begin by understanding the boundaries between server and client components. Add "use client" only when you need hooks, event handlers, or browser APIs. Use async/await directly in your components for data fetching. Leverage Server Actions for form submissions and server-side mutations. By following these principles, you will naturally find the right balance for your application.

In summary, server components are not a replacement for client components but a complement to them. They exist to solve specific problems related to performance, data fetching, and security. Use them where they make sense, and do not force your entire application into a single paradigm. The goal is always the same: build applications that are fast, maintainable, and provide a great user experience.

## The Evolution of Rendering in React

To understand server components, we need to look at the path React has taken. In the beginning, we had classic CSR: the browser downloads empty HTML, downloads the JavaScript bundle, hydrates React, and only then the application comes to life. It worked, but had performance costs, especially on more modest devices and slower connections.


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-10-01-react-server-components-quando-e-como-usar-no-next-js.jpg" alt="React Server Components: When and How to Use in Next.js" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>

Next.js emerged with the idea of Server-Side Rendering (SSR): React was executed on the server, HTML was sent ready to the browser. This significantly improved First Contentful Paint (FCP) and SEO, but brought the hydration problem: you sent server-generated HTML, and the browser had to re-execute all React logic to make the page interactive. If you have a complex dashboard with a lot of JavaScript, this becomes a bottleneck.

Server Components represent a third way: components that execute exclusively on the server and don't send JavaScript to the browser. They can access server resources (databases, file systems, internal APIs) and return HTML directly, without hydration. The browser receives only the final result.

## Server Components versus Client Components: The Practical Differences

The fundamental distinction between server and client components lies in the lifecycle and what each can do.


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-10-01-react-server-components-quando-e-como-usar-no-next-js-1.jpg" alt="React Server Components: When and How to Use in Next.js" loading="lazy">
<figcaption>Subsequent secure socket layers (SSL and TLS), implemented several years later using the architecture and key ideas first presented in SNP, enabled secure e-com. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3A2004_ACM_Software_System_Award_Certificate.jpg">2004 ACM Software System Award Certificate.jpg</a> por Ssl-wiki2021 — <a href="http://creativecommons.org/publicdomain/zero/1.0/deed.en">CC0</a> · via Wikimedia Commons</figcaption>
</figure>

Client components are the React you know: they can use hooks (useState, useEffect, useContext), manage user interaction state, and run entirely in the browser. They are sent as part of the JavaScript bundle and React hydrates them to make them interactive. When you write a component that responds to click events, typing, or any other interaction, it needs to be a client component.

Server components operate in a completely different way. They cannot use state hooks or effect hooks because they do not exist in the browser â they run on the server during rendering and produce HTML that is sent to the client. The practical implication is that you can import modules directly from the server (database connections, file system utilities) without exposing them to the browser. It is like having a function that runs on the backend but can be used in your UI as if it were any other component.

```tsx
// Client component example
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-4 border rounded">
      <p>Count: {count}</p>
      <button 
        onClick={() => setCount(c => c + 1)}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Increment
      </button>
    </div>
  );
}
```

```tsx
// Server component example
import { db } from '@/lib/db';

export async function UserProfile({ userId }: { userId: string }) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, posts: true }
  });

  if (!user) return <p>User not found</p>;

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <span className="posts-count">
        {user.posts.length} posts published
      </span>
    </div>
  );
}
```

The second example makes a direct query to the database within the component. In a traditional architecture, this would be unthinkable â you would need a REST or GraphQL API, a backend endpoint, and the component would request the data via useEffect. With server components, the query runs on the server and the HTML arrives ready in the browser.

## When to Use Each Component Type

The general rule I follow is simple: start with server components and add 'use client' only when you need interactivity. It seems obvious, but many people invert the logic.

Server components are ideal for static content or content that rarely changes, components that only display data (lists, profiles, feeds), UI parts that do not depend on user events, and any logic that needs to access server resources. If you are building a landing page, a blog post, a product listing â all of these naturally tend to be server components.

Client components are justified when you need useState, useEffect, or any React hook, when you have event handlers (onClick, onChange, onSubmit), when you use the Context API, or when a component needs to be interactive in some way. Buttons, forms, modals, carousels, accordions â these are client components.

The point that causes the most confusion is the mix: you can have client components that render server components inside them. The usual structure is a parent server component that fetches data and renders client components that handle the interaction. The server component already delivers HTML with the data filled in, and the client component just needs to "come alive" to respond to clicks and states.

```tsx
// page.tsx - Server Component (page is server by default)
import { ProductList } from '@/components/ProductList';
import { getProducts } from '@/lib/products';

export default async function ShopPage() {
  const products = await getProducts();
  
  return (
    <main>
      <h1>Our Store</h1>
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

```javascript
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setSortBy('price')}>By Price</button>
        <button onClick={() => setSortBy('name')}>By Name</button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {sorted.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
```

In this pattern, the page fetches data from the server and passes it as an initial prop to the client component. The HTML arrives with the products already rendered, and the sorting interactivity works immediately. The user doesn't see a loading spinner while the products load â they're already there.

## Server-Side Data Fetching: Patterns That Work

The way to fetch data in server components is surprisingly simple: you can use async/await directly in the component body. You do not need useEffect, complex loading states, or error handling across multiple layers.

Next.js treats the async function as a promise and automatically wraps the component in Suspense while the data loads. This allows you to think of data fetching as something serialized: first the header loads, then the main content, and the browser can already show something while it waits.

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
        <p className="meta">{post.author} Ã¢ÂÂ¢ {post.date}</p>
      </header>
      
      <div className="content">{post.content}</div>
      
      <section className="comments">
        <h2>Comments</h2>
        <Suspense fallback={<p>Loading comments...</p>}>
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

There are some important points here. The use of cache is essential because server components can be executed multiple times during a request or in subsequent requests. The cache function avoids duplicate queries to the database or API. Suspense allows granular loading states: each section can have its own skeleton while loading, and Next.js can do progressive streaming of the HTML.

The Suspense fallback is important for perceived performance. If you have a page with slow data, showing something immediately (even if it's just "Loading...") is better than a blank screen. Next.js can send the HTML for the fast parts first and stream the slow parts as they complete.

## Streaming and Suspense: Progressive Performance

Streaming is one of the most powerful features of server components and is often overlooked. When you mark a component with Suspense, Next.js can start sending HTML to the browser before finishing the entire rendering. The browser receives HTML packets as they become ready, which means the user starts seeing content sooner.

In practice, this creates a layout that appears gradually: the header and sidebar load first, then the main content, and finally secondary widgets. First Contentful Paint improves dramatically, and the experience feels more fluid because something appears on the screen almost immediately.

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

Each Suspense defines a fallback that is shown while the corresponding component loads. Next.js determines the streaming order based on component tree depth and what becomes available faster. It is not magic â you still need to optimize your queries â but it completely changes the user experience.

Streaming is particularly effective when you have data from different sources with distinct latencies. A widget that depends on a slow external API does not need to block the entire page; it loads at its own pace while the rest of the UI is already interactive.

## Forms with Server Actions

Before Server Actions, forms in React were client-side only: you captured the submit event, prevented the default behavior, made a manual fetch, and handled loading and error states. Server Actions change this radically: you can call server functions directly from HTML, with graceful fallback for disabled JavaScript.

```tsx
// app/actions.ts
'use server';

export async function createUser(formData: FormData) {
  const name = formData.get('name');
  const email = formData.get('email');
  
  if (!name || !email) {
    return { error: 'Name and email are required' };
  }
  
  try {
    await db.user.create({
      data: { name: String(name), email: String(email) }
    });
    return { success: true };
  } catch (e) {
    return { error: 'Failed to create user' };
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
        <label htmlFor="name">Name</label>
        <input type="text" id="name" name="name" required />
      </div>
      
      <div>
        <label htmlFor="email">Email</label>
        <input type="email" id="email" name="email" required />
      </div>
      
      <button type="submit">Create User</button>
    </form>
  );
}
```

The form works even without JavaScript in the browser. When JS loads, Next.js hydrates the form and starts using fetch internally, providing a SPA experience. You can add loading and error states using useFormState (formerly useActionState in React 19):

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
      {state.success && <p className="success">User created!</p>}
      
      <button type="submit">Submit</button>
    </form>
  );
}
```

The combination of server actions with server components is particularly productive. You can have a page that shows a form and also lists existing records â both server components â and the form action that creates new records redirects back to the same page, which is automatically revalidated.

## Performance Considerations

Server components eliminate JavaScript from the bundle, but that doesn't mean your entire application should be server components. Performance is about trade-offs, and understanding those trade-offs is essential.

The main benefit of server components is JavaScript bundle reduction. If you have a page with many components that only display data (tables, lists, info cards), those components don't add anything to the bundle when they are server components. The HTML arrives ready and interactive as much as possible.

Client components hydrate and become interactive, but React needs to process the component tree. If you have too many nested components with useEffect and local state, hydration can become heavy. Server components completely avoid this for parts that don't need state.

The bottleneck shifts: instead of worrying about JavaScript bundle size, you need to worry about server latency. Slow database queries, external APIs with high latency, heavy synchronous operations â all of this blocks server-side rendering and can leave the user waiting longer than they would with traditional CSR.

Cache is critical. Next.js caches builds by default, so static pages are served instantly. When you have data that changes frequently, you need revalidation strategies: Time-Based Revalidation (revalidate every N seconds), On-Demand Revalidation (revalidate after creating/updating data), or an API route that you call manually.

```tsx
// Revalidate every hour
export const revalidate = 3600;

// Or on-demand revalidation
import { revalidatePath } from 'next/cache';

revalidatePath('/products');
revalidatePath('/products/[id]', 'page');
```

## Conclusion

React Server Components don't replace client components â they complement them. The ideal architecture is a mix where the server handles fetching data and rendering static UI, and the client adds interactivity where needed. This model works well for everything from landing pages to complex dashboards.

Migrating an existing CSR application to server components requires planning. You don't need to migrate everything at once; you can start with new pages or specific components. The key is to identify what is content (server) and what is interaction (client) and architect accordingly.

## Sources

- [React Docs: Server Components](https://react.dev/reference/react/rsc)
- [Next.js Docs: Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js Docs: Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [React Docs: Suspense](https://react.dev/reference/react/Suspense)
- [Next.js Docs: Caching](https://nextjs.org/docs/app/building-your-application/caching)

## Practical Takeaways

- Start your components as server components and add 'use client' only when you need interactivity (hooks, event handlers)
- Use Suspense to create granular loading states and improve the perception of performance
- Server Actions are ideal for forms that need to create or update data on the server
- Implement strategic cache and revalidation for each route based on how frequently the data changes
- Don't abandon client components â they are still necessary for interactivity, but server components should be the foundation of your UI