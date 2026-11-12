---
title: "React Server Components: when and how to use them in Next.js"
date: "2026-08-28"
category: "tutorial"
tags: ["react", "server-components", "nextjs"]
excerpt: "React Server Components and Next.js: how server-side rendering shrinks the client bundle, and when this architecture makes sense."
share_hook: "Server vs Client Components, streaming and Server Actions - when each one fits."
cover:
  image: "/covers/2026-08-28-react-server-components-quando-e-como-usar-no-next-js.jpg"
comments: true
translationKey: "2026-08-28-react-server-components-quando-e-como-usar-no-next-js"
---


The frontend ecosystem spent years focused on running everything in the client's browser, but the modern architecture of frameworks like Next.js has changed the game by bringing the server back to the center of rendering decisions.

When I started building my own projects and structuring interfaces with React, the division between what runs on the server and what runs on the client seemed like a secondary implementation detail. In practice, understanding this boundary determines whether your application will load instantly or stutter on more modest mobile devices.


<figure>
  <img src="/media/2026-08-28-react-server-components-quando-e-como-usar-no-next-js.jpg" alt="The React logo: components that run on both server and client." loading="lazy" />
  <figcaption>
    The React logo: components that run on both server and client. — Image: <a href="https://commons.wikimedia.org/wiki/File%3AReact.svg">React.svg</a> by ReactJS —
    <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a> · via Wikimedia Commons
  </figcaption>
</figure>

## Server vs Client Components

The basic premise of React Server Components, or RSC, is that the code executed on the server never reaches the end user's browser. This means that heavy database dependencies, sensitive business logic, and direct API calls can live on the server without inflating the JavaScript bundle sent to the client.

In Next.js, by default, all components inside the app folder are Server Components. They render on the server, generate static or dynamic HTML, and send only the final result to the browser. 

Client Components, in turn, need to be explicitly marked with the 'use client' directive at the top of the file. They still run on the server during the initial render to generate the supporting static HTML, but they are also executed in the browser to manage interactivity, local state, and side effects.

A common mistake is trying to treat 'use client' as a shortcut button to solve import problems. When a Client Component is declared, the entire component tree imported by it also becomes part of the bundle sent to the browser.

## When to Use Each One

The rule of thumb for deciding between Server and Client Components is based on the need for interactivity and access to browser features.


<figure>
<img src="/covers/2026-08-28-react-server-components-quando-e-como-usar-no-next-js.jpg" alt="React Server Components: when and how to use them in Next.js" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>
Server Components should be the default choice for most of the application. They come into play when you need to fetch data directly from a database, keep API keys hidden from the client, reduce the JavaScript bundle size, or render heavy static and textual content.

Client Components come in when the interface requires direct interactivity. This includes using state hooks like `useState` and `useEffect`, handling click or keyboard events, using browser APIs like `localStorage` or geolocation, and third-party libraries that rely on DOM-based visual components.

In systems I develop, such as dashboards or task management tools, most of the layout structure, static data tables, and initial requests stay on the server. Only small blocks of dynamic forms and action buttons receive the client directive.

## Data fetching server-side

Data fetching in Server Components eliminates the need for complex manual loading states with useEffect and external client-side caching libraries for initial static or dynamic data.

Since the component runs on the server, database queries or fetch calls can be made directly.

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

In this example, the SQL code or HTTP request happens directly on the server. The client receives only the finished HTML list. No sensitive connection data is leaked to the browser, and the volume of JavaScript shipped is drastically reduced.

## Streaming and Suspense

Server Components introduce a considerable advantage in content delivery through chunk-based streaming. Instead of waiting for the server to process the entire page before sending any bytes to the browser, Next.js can send the HTML in chunks as the data becomes ready.

Using the Suspense component allows you to isolate slow parts of the application without blocking the loading of the main layout.

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

The header and static text appear immediately to the user. Meanwhile, the SlowAnalytics component fetches heavy data from the backend and is injected into the screen as soon as processing finishes.

## Forms with Server Actions

Server Actions allow you to execute asynchronous functions directly on the server, triggered by form elements on the client, reducing the need to create dedicated API routes for simple data mutation operations.

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

In the UI component, the action is passed directly to the form's action prop.

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

This approach simplifies code architecture. Submission state management can be complemented with the useFormStatus hook to disable the button during processing, keeping the experience smooth without requiring a heavy form management library.

## Performance

Adopting Server Components directly impacts crucial performance metrics, especially Largest Contentful Paint and Total Blocking Time. 

Since a large portion of the rendering and parsing work happens on the server, the user's browser spends less time executing startup scripts. This is noticeable on mobile devices and entry-level computers, which suffer less from main thread blocking during the loading of heavy applications.

Keeping the ecosystem clean by avoiding the unnecessary use of 'use client' ensures that the final bundle delivered to the client contains only what is strictly necessary for interaction.

## Conclusion

The Server Components model in Next.js requires a mindset shift in how we design web applications. Separating what is static from what is interactive makes the code cleaner, improves overall performance, and simplifies the data flow.

- Use Server Components as the default for data fetching and structural rendering.
- Reserve the 'use client' directive strictly for places that require interactivity or browser APIs.
- Leverage Suspense to improve perceived performance with partial loading.
- Utilize Server Actions to simplify data mutations without creating unnecessary API routes.

## Sources

- [Next.js Documentation: Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [React Documentation: Server Components](https://react.dev/reference/react/components)
- [Next.js Documentation: Server Actions and Mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
## 📸 Cover image credit
- **Image:** [React.svg](https://commons.wikimedia.org/wiki/File%3AReact.svg)
- **Author:** ReactJS
- **License:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) · via Wikimedia Commons

## 📸 Cover image credit
- **Image:** [BalticServers data center.jpg](https://commons.wikimedia.org/wiki/File%3ABalticServers_data_center.jpg)
- **Author:** BalticServers.com
- **License:** [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · via Wikimedia Commons
