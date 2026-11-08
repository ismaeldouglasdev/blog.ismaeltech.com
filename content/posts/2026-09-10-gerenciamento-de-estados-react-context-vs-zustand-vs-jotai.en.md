---
title: "State management: React Context vs Zustand vs Jotai"
date: "2026-09-10"
category: "article"
tags: ["react", "state", "zustand", "jotai"]
excerpt: "State Management: React Context vs. Zustand vs. Jotai."
share_hook: "Context vs Zustand vs Jotai - real performance numbers and when Context stops being enough."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-09-10-gerenciamento-de-estados-react-context-vs-zustand-vs-jotai.jpg"
comments: true
translationKey: "2026-09-10-gerenciamento-de-estados-react-context-vs-zustand-vs-jotai"
---


Have you ever spent an entire afternoon debugging an update that didn't trigger a component re-render, only to discover the culprit was a `useMemo` wrapping your context? Or seen a project grow to the point where any global state change ends up affecting half the component tree? State management in React isn't just about storing data: it's about preventing those reality checks that make you question your career choices.

React is powerful, but it doesn't come with a ready-made solution for what happens when `useState` starts leaking across the entire app. Over time, you realize that state management isn't a *nice to have*: it's what separates maintainable code from a structure that collapses with the first new feature.

When state starts leaking across the entire app, managing it becomes critical for maintainability.

I'll compare three approaches I've encountered in practice: React Context (the native one), Zustand (the minimalist), and Jotai (the atomic). No pure theory: just what works, what hurts, and in which scenarios each one behaves well.

## When Context Is No Longer Enough

React Context is built-in, requires no external dependencies, and works. True. But does it work well?

Context is great for values that change infrequently: themes, authentication, global configurations. For example, in an NGO project I worked on (Mensageiros da Esperança), context works well for storing the logged-in user and permissions: these only change at login/logout.

The problem arises when you try to use Context for state that changes frequently: form inputs, cart product lists, loading status. Each update triggers re-renders in all consumers, even if the value consumed by that specific component hasn’t changed. This is the infamous "over-rendering."

In one of my first React projects (a Linux theming dashboard), I started with Context for everything. The result? When the user changed the Hyprland transparency slider (yes, that was app state), the entire app re-rendered, including package lists, theme previews, and settings. It wasn’t sustainable.

Context is simple to understand, but its internal implementation (the provider as a component with its own state) creates a rendering dependency that’s often heavier than it appears.

## Zustand: Simple API, Real Results

Zustand emerged as a response to this complexity. Its API is minimal: you essentially create a store with `create`, pass an initial state and mutations. No providers needed, no complex hooks, no manual memoization.


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-10-gerenciamento-de-estados-react-context-vs-zustand-vs-jotai-1.jpg" alt="State management: React Context vs Zustand vs Jotai" loading="lazy">
<figcaption>Chemist Tesia Irwin tests a 3D printer on July 28, 2022, at Swamp Works at NASA’s Kennedy Space Center in Florida, as part of the Relevant Environment Additive. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AREACT_Demonstration_%28KSC-20220728-PH-FMX02_0029%29.jpeg">REACT Demonstration (KSC-20220728-PH-FMX02 0029).jpeg</a> por Frank Michaux — <a href="https://creativecommons.org/licenses/">Public domain</a> · via Wikimedia Commons</figcaption>
</figure>

```ts
// Example: stock management
import { create } from 'zustand';

interface StockState {
  items: Record<string, number>; // SKU -> quantity
  loading: boolean;
  error: string | null;
  fetchStock: () => Promise<void>;
  updateQuantity: (sku: string, delta: number) => void;
}

export const useStockStore = create<StockState>((set) => ({
  items: {},
  loading: false,
  error: null,
  fetchStock: async () => {
    set({ loading: true, error: null });
    try {
      // Simulação: chamada à API externa
      const response = await fetch('/api/stock');
      const data = await response.json();
      set({ items: data, loading: false });
    } catch (err) {
      set({ error: 'Falha ao carregar estoque', loading: false });
    }
  },
  updateQuantity: (sku, delta) => {
    set((state) => ({
      items: {
        ...state.items,
        [sku]: (state.items[sku] || 0) + delta,
      },
    }));
  },
}));
```

Zustand is a good choice because I needed global state that was easy to test and persist. Zustand has native middleware support, so I added a `persist` middleware that saves stock to localStorage: useful when sync with the market fails and you want to keep local state functional.

One thing that stood out to me: Zustand avoids the "wrapper hell" of Context. You use the hook directly in the component, without nesting providers or worrying about unnecessary re-renders. The selector from `useStore` lets you pick only what the component needs:

```tsx
function StockBadge({ sku }: { sku: string }) {
  const quantity = useStockStore(
    (state) => state.items[sku] ?? 0,
    shallow
  );

  return (
    <span className={quantity < 10 ? 'text-red-500' : ''}>
      {quantity} un.
    </span>
  );
}
```

The `shallow` (from `zustand/shallow`) performs shallow reference comparison: important when your selector returns objects or arrays. This prevents re-renders even when the rest of the state changes.

## Jotai: atomic state, no complications

Jotai follows a different principle: atomic state. Instead of a single large object, you divide state into small units ("atoms") that can be combined freely.

```ts
// Practical example: task management
import { atom } from 'jotai';

export const tasksAtom = atom<Task[]>([]);
export const filteredTasksAtom = atom((get) => {
  const tasks = get(tasksAtom);
  const filter = get(filterAtom);
  
  return tasks.filter(task => task.status === filter);
});
export const activeTasksCountAtom = atom((get) => {
  const tasks = get(tasksAtom);
  return tasks.filter(t => t.status === 'active').length;
});
```


The coolest part is composition: `filteredTasksAtom` is automatically recalculated whenever `tasksAtom` or `filterAtom` changes. No need for `useMemo`, `useSelector`, or extra logic. Jotai already knows which dependencies each atom has and only recalculates what's necessary.

For components, you use `useAtomValue` or `useAtom`:

```tsx
function TaskList() {
  const tasks = useAtomValue(filteredTasksAtom);

  return (
    <ul>
      {tasks.map(task => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  );
}
```

And if you need to mutate? Jotai has mutable atoms (with `write`), but it recommends preferring derived atoms whenever possible. This removes the temptation to put imperative logic directly into state.


## Comparing Performance

Performance isn't just about how many milliseconds it takes to update: it's about how many components re-render, how many equality checks are performed, and how the garbage collector feels.


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-10-gerenciamento-de-estados-react-context-vs-zustand-vs-jotai-2.jpg" alt="State management: React Context vs Zustand vs Jotai" loading="lazy">
<figcaption>Chemist Tesia Irwin tests a 3D printer on July 28, 2022, at Swamp Works at NASA’s Kennedy Space Center in Florida, as part of the Relevant Environment Additive. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AREACT_Demonstration_%28KSC-20220728-PH-FMX02_0030%29.jpeg">REACT Demonstration (KSC-20220728-PH-FMX02 0030).jpeg</a> por Frank Michaux — <a href="https://creativecommons.org/licenses/">Public domain</a> · via Wikimedia Commons</figcaption>
</figure>

In the traditional context (without memoization), every context update triggers re-renders in all components that consume that context, even if the specific value used by each one doesn't change. React has no way of knowing this, since the object returned by the provider is new on every render.

Zustand avoids this with the `useStore` hook, which uses internal state references (via `useSyncExternalStore`) and selective comparison. Only components using the changed state re-render. In tests with lists of 100+ items, Zustand maintained 60fps even with frequent updates.

Jotai shines when you have many interdependent atoms. Each atom knows which other atoms it reads, so it only recalculates the derived values that need it. In a scenario with filter + search + pagination (as in one of my prototype tests), Jotai re-rendered only what was necessary: the list, not the filters.

But be careful with excessive cascading derived atoms. If you have 10 levels of `atom((get) => get(anotherAtom))`, every change at the bottom triggers recalculation across all of them. Jotai is fast, but not magical.

Context without memoization: slow. Context with `useMemo` on every provider and `React.memo` on every consumer: laborious, but possible. Zustand/Jotai: less code, fewer surprises.

## When to use each one

**React Context:**
- Static values or those that rarely change (auth, theme, global settings)
- Small projects where the simplicity of having no heavy dependencies outweighs performance concerns
- When you already have a complex component tree and don't want to rewrite it

**Zustand:**
- Global state that changes frequently (carts, forms, lists)
- When you want a simple and straightforward API
- For projects where testability and persistence are important
- When you need custom middleware (persist, logger, API middleware)

**Jotai:**
- Complex state with many interdependent values (dashboards, editing tools)
- When you want to avoid state nesting and prefer composition
- For components that need multiple independent values
- When specific update performance is critical (e.g., large grids, lists with drag-and-drop)


```markdown
## What to do if you're already using Context?

Migration doesn't need to happen overnight. You can do it layer by layer.

1. **Identify the problematic contexts:** those that cause cascading re-renders, or that you had to manually memoize multiple times.

2. **Extract to a store:** take the context value and create an equivalent Zustand/Jotai store. Don't change anything in the component yet.

3. **Replace consumption one by one:** start with the simplest components. If you use `useContext(MyContext)` and the value is used directly, change to `useMyStore((s) => s.value)`.

4. **Use middleware for migration:** Zustand has `persist` that reads the old JSON from localStorage, so you can migrate old Context values to Zustand without losing state.

Context works well for simple carts. When the product list exceeds a few hundred items, re-renders become noticeable. Migrating to a solution like Zustand brings performance gains with less boilerplate.

The easiest part to migrate was persistence: the Context already saved the cart to localStorage. With Zustand, I just added `middleware: persist` and adjusted the key. Done.
```

## Conclusion

State management in React isn’t about choosing the most popular option: it’s about choosing what solves your problem with the minimum complexity.

- **Context** is still the simplest option for stable state and values that don’t change frequently. But don’t be fooled: with dynamic state, it can quickly become a performance nightmare.

- **Zustand** is my default choice today: simple API, good performance, and flexible enough to support custom middleware. It strikes the right balance between minimalism and power.

- **Jotai** shines in applications where state is naturally modular: dashboards, editing tools, anything with many interdependent values.

Ultimately, the best state management is the one you understand and can maintain. It’s not worth swapping Zustand for Context just because it’s native, or vice versa. But knowing when each makes sense? That’s what separates a project that scales from one that collapses at the first new feature.

### Practical takeaways

- Start with local `useState` and simple contexts. Migrate only when the pain is real, not before.
- If you need persistence or middleware, Zustand pays off better.
- For complex state with many derivations, Jotai avoids cascading re-renders.
- Never use Context for frequently changing state without memoization, or use `useContext` with `useMemo` in the provider and `React.memo` on consumers (though this already erodes the simplicity).
- Test performance with the DevTools Profiler: see how many components re-render on a single update.

State management is invisible until it breaks. Investing time to choose the right tool matters more than picking something “right” today only to rewrite it tomorrow.

## Sources

- [React Docs: Context](https://react.dev/reference/react/createContext)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Jotai GitHub](https://github.com/pmndrs/jotai)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Jotai Documentation](https://jotai.org/)
- [React Docs: useMemo](https://react.dev/reference/react/useMemo)
## 📸 Cover image credit
- **Image:** [Infrared photography of computer hardware - DSC05331.jpg](https://commons.wikimedia.org/wiki/File%3AInfrared_photography_of_computer_hardware_-_DSC05331.jpg)
- **Author:** Smrao
- **License:** [CC0](https://creativecommons.org/publicdomain/zero/1.0/) · via Wikimedia Commons
