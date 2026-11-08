---
title: "Advanced React Hooks: Essential useEffect, useRef, and Custom Hooks"
date: "2026-08-18"
category: "tutorial"
tags: ["react", "hooks", "javascript", "frontend"]
excerpt: "By 2018, 85% of React projects had already adopted Hooks."
share_hook: "useEffect cleanup, useRef, custom hooks, and the mistakes that keep showing up."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-08-18-react-hooks-avancados-useeffect-useref-e-custom-hooks.jpg"
comments: true
translationKey: "2026-08-18-react-hooks-avancados-useeffect-useref-e-custom-hooks"
---



## Introduction: Why Hooks Changed React?

> **“In 2018, 85 % of React projects had already adopted Hooks.”** – State of React Survey 2023  

If you started coding in React before version 16.8, you probably still remember the saga of *class components*: `componentDidMount`, `componentWillUnmount`, `this.setState`, and the endless battle with method *binding*. It was a period of limited productivity and, let’s face it, verbose code.

Then, Hooks arrived as a silent revolution. They brought two core promises:

1. **Simple composition of state logic** – no inheritance hierarchies or complicated “wrapper components”.  
2. **Direct access to the lifecycle** – everything inside the same function, without needing to create classes.

But, like any powerful tool, Hooks require deep understanding. It’s not enough to use `useState` and `useEffect` superficially; to truly unlock React’s potential, we need to master *advanced hooks*: `useEffect` with proper cleanup, `useRef` for persistent values and DOM references, and, of course, create our own reusable *custom hooks*.

In this article, we’ll dive into the details that make a difference in the day‑to‑day life of a full‑stack developer. Grab your keyboard, open VS Code, and follow the real‑world examples you can copy‑paste into your projects.

---


<figure>
  <img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-08-18-react-hooks-avancados-useeffect-useref-e-custom-hooks.jpg" alt="The React logo, the open source JavaScript library that popularized Hooks." loading="lazy" />
  <figcaption>
    The React logo, the open source JavaScript library that popularized Hooks. — Image: <a href="https://commons.wikimedia.org/wiki/File%3AReact-icon.svg">React-icon.svg</a> by Facebook —
    <a href="https://en.wikipedia.org/wiki/Public_domain">Public domain</a> · via Wikimedia Commons
  </figcaption>
</figure>

## useEffect with cleanup and dependencies

### What does `useEffect` actually do?

The `useEffect` replaces class lifecycle methods (`componentDidMount`, `componentDidUpdate`, `componentWillUnmount`). It accepts **two** things:


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-08-18-react-hooks-avancados-useeffect-useref-e-custom-hooks.jpg" alt="Advanced React Hooks: Essential useEffect, useRef, and Custom Hooks" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>
```tsx
useEffect(() => {
  // side‑effect (colateral effect)
  return () => {
    // cleanup function
  };
}, [/* list of dependencies */]);
```

- The **first argument** is the function that will be executed **after** rendering.
- The **returned value** (if any) will be called **before** the next effect execution or when the component unmounts.
- The **second argument** (dependency array) controls *when* the effect should re‑run.

### Example 1 – Data fetch with cancellation

Imagine a component that fetches a user's details on mount. If the user navigates away before the request finishes, we need to abort the call to avoid *memory leaks* and state updates in unmounted components.

```tsx
import { useEffect, useState } from 'react';

function useUser(id: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController(); // <-- allows cancellation

    async function fetchUser() {
      try {
        const response = await fetch(`/api/users/${id}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Falha ao buscar usuário');
        const data = await response.json();
        setUser(data);
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();

    // cleanup: abort the request if the component unmounts or id changes
    return () => controller.abort();
  }, [id]); // <-- correct dependency

  return { user, loading, error };
}
```

**Practical tips**

- **Always include the variables used inside the effect** (`id` in the example) in the dependency list. The ESLint plugin `react-hooks/exhaustive-deps` helps detect missing ones.
- **AbortController** works in modern browsers and in Node (via `node-fetch`). For legacy support, use libraries like `axios` that already have built‑in cancellation.

### Example 2 – `setInterval` with cleanup

A simple second‑by‑second counter seems easy, but if we don’t clear the interval, the timer will keep running even after the component unmounts.

```tsx
import { useEffect, useState } from 'react';

export function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    // cleanup
    return () => clearInterval(id);
  }, []); // [] ensures the interval is created only once

  return <p>Elapsed time: {seconds}s</p>;
}
```

**Key point**: if you put `seconds` in the dependency list, the effect will re‑run on every update, creating multiple timers. Therefore, use the functional form of `setState` (`s => s + 1`) to access the latest value without needing `seconds` as a dependency.

### When to use multiple `useEffect`s

There's no problem splitting the logic into several effects, each handling a different concern. This improves readability and avoids over‑engineering of dependencies.

```tsx
useEffect(() => {
  // effect A – listens to resize events
  const onResize = () => console.log(window.innerWidth);
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}, []); // effect A has no props/state dependencies

useEffect(() => {
  // effect B – fetch data when `userId` changes
  fetchUser(userId);
}, [userId]); // effect B depends only on userId
```

## useRef to access the DOM and persistent values

### What does `useRef` actually store?

- **A DOM reference** – widely used for focusing inputs, measuring elements, or integrating third-party libraries.
- **A mutable value that persists across renders** – unlike `useState`, changing `ref.current` does **not** trigger a new render.

### Example 1 – Focusing a text field on mount

```tsx
import { useEffect, useRef } from 'react';

export function SearchBox() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus(); // ensures the input receives focus
  }, []); // runs only on mount

  return <input ref={inputRef} placeholder="Search..." />;
}
```

### Example 2 – Storing the previous value of a prop

We often need to compare the current value of a prop with the previous one (for example, to trigger animations). `useRef` allows us to store the "previous value" without causing a re-render.

```tsx
import { useEffect, useRef } from 'react';

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]); // updates on every change
  return ref.current;
}

// Usage in the component
export function PriceTag({ price }: { price: number }) {
  const prevPrice = usePrevious(price);
  const changed = prevPrice !== undefined && price !== prevPrice;

  return (
    <div>
      <span>Price: R$ {price.toFixed(2)}</span>
      {changed && <em> (changed from R$ {prevPrice?.toFixed(2)})</em>}
    </div>
  );
}
```

### Example 3 – Render counter without re-rendering

```tsx
import { useRef } from 'react';

export function RenderCounter() {
  const renders = useRef(0);
  renders.current += 1; // increments on every render

  return <p>Renders: {renders.current}</p>;
}
```

> **Fun fact:** If you want the value to be displayed in the UI, you will still need `useState` (or `useReducer`). Here, `useRef` serves merely as a *measuring tool*.

### Advanced tips

1. **Avoid using `ref` as "state"** – changing `ref.current` does not update the UI. If the UI depends on the value, use `useState`.
2. **References to third-party components** – when integrating with libraries like `Chart.js` or `Mapbox`, create the canvas or container with a `ref` and initialize the library inside a `useEffect` with a cleanup function that destroys the instance.
3. **Persistence across routes** – `useRef` can store temporary data that doesn't need to be serialized in the URL or in `localStorage`. It is ideal for storing API "caches" that don't justify full persistence.

---

## Real-world custom hooks you need to know

Creating *custom hooks* is the art of **extracting reusable logic** and **isolating side effects**. When well-designed, they make code more declarative and testable.

### 1. `useFetch` – Generic fetch with loading and error states

```tsx
import { useEffect, useState } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic hook for GET requests.
 * @param url API URL
 * @param options Fetch options (headers, etc.)
 */
export function useFetch<T>(url: string, options?: RequestInit) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setState(prev => ({ ...prev, loading: true }));
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = (await res.json()) as T;
        setState({ data, loading: false, error: null });
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setState({ data: null, loading: false, error: e.message });
        }
      }
    }

    load();

    return () => controller.abort();
  }, [url, JSON.stringify(options)]); // pay attention to serializing options

  return state;
}
```

**How to use**

```tsx
function UsersList() {
  const { data: users, loading, error } = useFetch<User[]>('/api/users');

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <ul>
      {users?.map(u => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}
```

> **Tip:** Always include `JSON.stringify(options)` in the dependencies if you want changes to headers or query params to re-trigger the request. If the options are static, pass an object memoized with `useMemo`.

### 2. `useLocalStorage` – Sync state with `localStorage`

```tsx
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // silent failure – could be quota exceeded
    }
  }, [key, value]);

  return [value, setValue] as const;
}
```

**Typical usage**

```tsx
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('app-theme', 'light');

  return (
    <button onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}>
      Theme: {theme}
    </button>
  );
}
```

**Best practices**

- **Selective persistence** – not every state deserves to be in `localStorage`. Evaluate if the data will be reused across sessions.
- **Versioning** – when changing the structure of the stored object, consider clearing the key or migrating the data to avoid `JSON.parse` failures.

### 3. `useDebounce` – Debounce values or callbacks

Ideal for "type-ahead" searches, where we want to wait for the user to stop typing before firing the request.

```tsx
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}
```

**Usage example**

```tsx
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const { data: results, loading } = useFetch<Product[]>(
    `/api/products?search=${encodeURIComponent(debouncedQuery)}`
  );

  return (
    <>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search products..."
      />
      {loading && <p>Loading...</p>}
      <ul>
        {results?.map(p => (
          <li key={p.id}>{p.title}</li>
        ))}
      </ul>
    </>
  );
}
```

**Advanced trick:** If you need to debounce *functions* (not just values), combine `useCallback` with `useRef`:

```tsx
export function useDebouncedCallback<T extends unknown[]>(
  callback: (...args: T) => void,
  delay = 300
) {
  const timeout = useRef<NodeJS.Timeout>();

  return (...args: T) => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => callback(...args), delay);
  };
}
```

---

## Common errors and how to avoid them

| Error | Why it happens | How to fix it |
|------|------------------|----------------|
| **Incomplete dependencies in `useEffect`** | ESLint might be disabled or ignored; developers think "it doesn't change, so I don't need it." | Keep the `react-hooks/exhaustive-deps` plugin active. When the dependency is an object or function, use `useMemo` or `useCallback` to stabilize it. |
| **Infinite render loops** | A `useEffect` that updates a state which is in its own dependency array. | Separate the logic: use a `useRef` to store values that don't need to trigger a re-render, or move the state update to another effect that doesn't depend on the same value. |
| **Stale closure (closing over old values)** | Functions created inside the effect capture the state at the time of creation and are not updated. | Include the variables in the dependency array or use the functional updater form of `setState` (`setCount(c => c + 1)`). |
| **Misusing `useRef` as state** | Mutating `ref.current` does not trigger a re-render, leading to an outdated UI. | When the UI depends on the value, use `useState`. Reserve `useRef` for "mutable storage" or DOM access. |
| **Custom Hooks that don't clean up resources** | External libraries (e.g., `Chart.js`, `WebSocket`) remain active after unmounting. | Always return a cleanup function in the hook's internal `useEffect`. |
| **Serializing complex objects in dependencies** | `useEffect([obj])` always triggers a new effect because `obj` has a different reference on every render. | Use `useMemo(() => obj, [obj.prop1, obj.prop2])` or serialize the object to a string (`JSON.stringify`) if it is small and stable. |
| **Over-abstraction** | Creating hooks for everything can create unnecessary layers | Only create a custom hook when the logic is reused in at least two places; keep simple logic inline. |

## Sources

- [MDN: Hooks Reference](https://developer.mozilla.org/en-US/docs/React/Hooks)
- [React Docs: useEffect](https://react.dev/reference/react/useEffect)
- [React Docs: useRef](https://react.dev/reference/react/useRef)
- [Kent C. Dodds: Custom Hooks](https://kentcdodds.com/blog/how-to-use-react-hooks-effectively)

## 📸 Cover image credit
- **Image:** [Programming.jpg](https://commons.wikimedia.org/wiki/File%3AProgramming.jpg)
- **Author:** Lorenzo Cafaro
- **License:** [CC0](https://creativecommons.org/publicdomain/zero/1.0/) · via Wikimedia Commons
