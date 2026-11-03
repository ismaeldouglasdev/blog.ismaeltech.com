---
title: "React performance: memo, useMemo, useCallback, and React Compiler"
date: "2026-10-13"
category: "article"
tags: ["react", "performance", "otimizacao"]
excerpt: "When to memoize, how React Compiler changes the game, and how to measure real impact with the Profiler."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-10-13-react-performance-memo-usememo-usecallback-e-react-compiler.jpg"
lang: "en"
comments: true
translation_of: "2026-10-13-react-performance-memo-usememo-usecallback-e-react-compiler"
---

## Introduction: when optimization becomes necessary

When a list grows and every interaction makes the browser stutter or flash, the problem is rarely "not enough CPU". Most of the time, it is unnecessary rendering in React. Knowing when to memoize, how React Compiler helps, and where `useMemo` and `useCallback` fit makes the difference between a fluid interface and a frustrating one.

The pain shows up in Chrome DevTools: hundreds of components rendering in a cascade, many of them receiving new props even when the background query returned no new data. The first attempt is usually wrapping everything with `React.memo`, but that only masks the symptom — the unnecessary renders keep happening deeper in the tree.

This pattern appears whenever components recompute expensive expressions, create new objects and functions on every render, or receive props that change identity without changing value. The result is a re-render cascade that the right tools can prevent.

Optimization is not an optional step "for when there is time". It is a direct answer to a real problem: reducing perceived latency improves the user experience and lowers infrastructure cost. Below are the tools that turn a reactive interface into a responsive one, with examples you can reproduce.

## React.memo: avoiding unnecessary renders

`React.memo` is a higher-order wrapper that memoizes the result of a function component. If props do not change, React reuses the last result, skipping a full render and commit cycle. In practice, a product grid can survive a fast-typed search as long as the list itself stays unchanged.

Consider a `<ProductGrid>` component that receives two props: `items` (the filtered array) and `onSelect` (a click handler). If the handler is an arrow function that does not depend on external data, its identity stays stable when created outside the component. Because `items` is a new reference on every keystroke (the query string is transformed into a new array), memo still triggers a render — but only for the grid, not for the whole layout tree above it.

The real gain appears when you combine `React.memo` with more granular state management. Keeping the selection set separate from the items array, for example with `useReducer`, prevents selecting one item from forcing the entire grid to render again.

A common mistake is wrapping *everything* with `React.memo` without analysis. Memoizing every item in a list individually increases memory usage, because each memoized component keeps its own cache of React elements. In most cases only the container (the list) needs memoization, while inner items stay functional.

In short, `React.memo` works best when there is a clear boundary of which props actually affect visual output. Use it as a first line of defense, not as a solution for every component.

## useMemo: caching expensive computations

`useMemo` stores the result of an expensive expression between renders. It is most useful when the computation costs more than a simple assignment — sorting, filtering, or aggregating a large array, for instance.

```js
// before
const sortedItems = items
  .filter(...)
  .sort((a, b) => b.score - a.score);

// after
const sortedItems = useMemo(() => (
  items
    .filter(...)
    .sort((a, b) => b.score - a.score)
), [items, query, sortKey]);
```

The dependency array is crucial. If `items` is regenerated on every keystroke (because the query is transformed), including it in the list guarantees the memoized value is discarded when the source changes. It also avoids a stale-update problem: if you accidentally omit a dependency, the old value can remain visible after the data changes.

Another classic case is rendering deep structures, such as a JSON viewer with thousands of entries. Rendering every node recursively on each scroll is prohibitively slow; wrapping recursion levels with `useMemo` ensures only visible nodes are re-evaluated.

`useMemo` pays off when the expression costs more than a simple `Array.prototype.map`. If you are only mapping an array of strings to JSX, the cost is negligible and memoization can even add overhead. A quick profile in React DevTools shows where memoization brings real benefit: sorting, data transformation, and recursive rendering of deep trees.

## useCallback: when reference stability matters

`useCallback` memoizes functions so their identity stays the same across renders. The goal is to prevent a new handler from forcing a memoized child component to render again.

A typical case: a `<CartButton>` wrapped with `React.memo` receives an `onAddToCart` handler. If the handler is an arrow function defined inside the parent component, it gets a new reference on every render, the prop comparison always fails, and memo never helps.

```js
// problem
const handleAdd = () => { /* logic */ };

// solution
const handleAdd = useCallback(() => { /* logic */ }, []);
```

If `handleAdd` needed state values, those values would go into the dependency list. When the handler does not access any React state, an empty list is enough.

There is a common trap: the stale closure. You pass a handler to a child component, the child stores it in a closure and exposes it later — creating a reference cycle that defeats memoization. The fix is to extract the logic into a pure function outside the component and then wrap that function with `useCallback`. Identity stays stable and the cycle breaks.

Use `useCallback` when a handler is passed to a memoized component or stored in state that triggers an effect. Use `useMemo` for computed values you need to compare or store. Mixing the two incorrectly creates a false sense of safety and more memory usage.

## React Compiler: what it is and why it matters

React Compiler changes the mental model of when memoization is needed. It analyzes the component tree and decides automatically where to apply `React.memo`, `useMemo`, and `useCallback`. The goal is to allow cleaner function components without sacrificing performance.

A practical example is a `<LazySection>` component that renders a heavy block only after an "Expand" click. Before the compiler, you had to wrap the component with `React.memo` and manage suspend state manually. With the compiler enabled, the same code works without extra memoization declarations: it detects that the component does not render on initial mount and inserts the necessary path.

The compiler works best with modern hook syntax, no hooks in class components, and integrates with React DevTools to show the memoization tree. But it is not magic: you still need pure components and no side effects during render. A `useEffect` that fetches data from the backend must stay explicit — the compiler cannot infer that this effect should be excluded.

One trap is that the compiler can be too aggressive with components that depend on context. With a `ThemeContext`, for example, the context object is a new reference on every provider render, which causes unnecessary renders across the tree. The fix is usually memoizing the provider value (`useMemo` on the context object) or splitting contexts by responsibility.

In short, React Compiler reduces the need for manual declarations, but the limits remain the same: pure components, stable effects, and stable dependencies.

## DevTools Profiler: measuring real impact

After applying `React.memo`, `useMemo`, and `useCallback`, the next step is validating whether the changes actually reduced rendering work. The React DevTools Profiler records every component render, with CPU time, render time, and additional renders.

A simple A/B test helps: compare the grid without memoization against the memoized version, measuring time per keystroke. Big gains are common — from ~120 ms to ~38 ms per key, for example — but so is increased memory usage, which only shows up after a few minutes. Measure both sides before celebrating.

The profiler also reveals hidden problems. A list that seems to render too much may be caused by a `useEffect` rebuilding a search index on every change; moving that index into `useMemo` eliminates several spikes per cycle.

Use the profiler sparingly. Long runs distort numbers; capture a profile that represents a typical user flow. With large datasets, it is common to find that most CPU time goes to re-evaluating nodes outside the viewport — which calls for memoizing the recursive render function or limiting depth to what is visible.

Finally, the profiler shows extra renders caused by context updates or poorly built state machines. A reducer that creates a new action object on every dispatch makes the whole tree compare new references; returning stable references eliminates the problem.

Without measuring, you may be adding unnecessary code or missing a hidden bottleneck.

## Anti-patterns: over-optimizing or optimizing wrong

Optimization is an iterative process. Starting with an excessive solution produces hard-to-maintain code. Some common anti-patterns:

First: "everything is memoized". Wrapping every card in a list with `React.memo` adds memory overhead and complexity with no gain. The component is too small to justify the cost; moving memo to the container simplifies the tree and cuts memory usage.

Second: `useMemo` for cheap operations. Wrapping a simple `array.map` that produces JSX adds a cache step on every render with no gain. If the expression costs less than a `requestIdleCallback` tick, memoization is unnecessary.

Third: forgetting to update dependency lists. Recreating a filters object on every keystroke and using it in `useMemo` means the memoized value is never reused, leading to stale filters. The fix is stabilizing the object (for example with `useReducer`) so it only changes when the primary key changes.

Fourth: assuming `useCallback` alone solves everything. A drag-and-drop handler passed to a memoized `<DragHandle>` can keep causing renders if the closure reads a mutable ref value that changes every frame. Extracting the handler into a pure function that reads the ref inside the body fixes it.

Last: relying only on React Compiler. If a component fetches a dynamic value on every render as a side effect, the compiler cannot know that and may preserve the unwanted behavior. Effects must be explicit.

The general pattern: start simple, profile, find the bottleneck, then apply the most granular tool that solves the problem without affecting unrelated components.

## Conclusion: a performance philosophy

React performance is not about "using more hooks". It is a combination of understanding data flow, knowing the tools, and having the patience to measure before acting. Memoizing top-level components, using `useMemo` for heavy computations, and `useCallback` for stable references often reduces render time per user input from over 100 ms to under 30 ms.

React Compiler adds another layer of abstraction, allowing cleaner components while delegating granular memoization to the compiler. Even so, pure components, stable effects, and stable dependencies remain prerequisites. And the Profiler is still the only reliable way to validate that optimization works.

One often-forgotten aspect is the cost of state maintenance. Moving the selection set into a dedicated reducer keeps the click handler identity stable, improving performance and making the action flow predictable. Small adjustments in action creation eliminate extra renders that used to go unnoticed.

Excessive optimization hurts readability. An over-memoized component becomes a maze of hooks, and it is hard to understand why it renders. Aim for the smallest granularity possible, always profiling before optimizing.

The same concerns extend to the backend: fewer renders on the front-end mean fewer API requests, which reduces server load and infrastructure cost.

## Practical takeaways

- Start by measuring. Use the Profiler to identify which components consume the most CPU time before adding any memoization.
- Apply `React.memo` only when props affect visual output; avoid wrapping small leaf components.
- Use `useMemo` for expensive expressions (sorting, filtering, heavy computation) and keep the dependency list accurate.
- Stabilize handlers with `useCallback` when they are passed to memoized components or stored in state that triggers effects.
- React Compiler reduces the need for manual declarations, but pure and stable components are still required.
- Monitor both CPU and memory: speed gains sometimes come with a memory cost.
- Keep the code simple. Optimize only what the profile flags as a bottleneck.
- Test on real connections. A component that is fast on a laptop can be a bottleneck on mobile networks.

---

## Sources

- React documentation: Hooks
  https://react.dev/reference/react
- React DevTools Profiler
  https://react.dev/learn/profile-your-react-application
- React Compiler
  https://react.dev/learn/react-compiler
- MDN: `Array.prototype.sort`
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
- `React.memo` documentation
  https://react.dev/reference/react/memo
- `useMemo` documentation
  https://react.dev/reference/react/useMemo
- `useCallback` documentation
  https://react.dev/reference/react/useCallback
