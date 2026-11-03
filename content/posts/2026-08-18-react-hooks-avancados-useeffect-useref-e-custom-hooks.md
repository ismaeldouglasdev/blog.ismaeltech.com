---
title: "React Hooks avançados: useEffect, useRef e custom hooks que você precisa conhecer"
date: "2026-08-18"
category: "tutorial"
tags: ["react", "hooks", "javascript", "frontend"]
excerpt: "Desde a versão 16.8 do React, os Hooks se tornaram o padrão da comunidade. Domine useEffect, useRef e custom hooks com exemplos de produção."
share_hook: "useEffect com cleanup, useRef para DOM e valores persistentes, e os custom hooks que você realmente usa — com os erros que mais aparecem."
lang: "pt"
---

## Introdução: Por que os Hooks mudaram o React? 

Desde que chegaram ao React na versão 16.8, no início de 2019, os Hooks se tornaram o padrão de facto da comunidade — praticamente toda biblioteca e tutorial moderno parte deles hoje.

Se você começou a programar em React antes da versão 16.8, provavelmente ainda tem na memória a saga dos *class components*: `componentDidMount`, `componentWillUnmount`, `this.setState`, e a eterna luta contra o *binding* de métodos. Foi um período de produtividade limitada e, convenhamos, de código verboso.

Então, os Hooks chegaram como uma revolução silenciosa. Eles trouxeram duas promessas centrais:

1. **Composição simples de lógica de estado** – nada de hierarquias de herança ou “wrapper components” complicados.  
2. **Acesso direto ao ciclo de vida** – tudo dentro da mesma função, sem precisar criar classes.

Mas, como toda ferramenta poderosa, os Hooks exigem compreensão profunda. Não basta usar `useState` e `useEffect` de forma superficial; para realmente extrair o potencial do React, precisamos dominar os *hooks avançados*: `useEffect` com limpeza correta, `useRef` para valores persistentes e referências ao DOM, e, claro, criar nossos próprios *custom hooks* reutilizáveis.

Neste artigo, vamos mergulhar nos detalhes que fazem a diferença no dia‑a‑dia de um desenvolvedor full‑stack. Prepare o teclado, abra o VS Code e acompanhe os exemplos reais que você poderá copiar‑colar nos seus projetos.

---  


<figure>
  <img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-08-18-react-hooks-avancados-useeffect-useref-e-custom-hooks.jpg" alt="O logo do React, a biblioteca JavaScript de código aberto que popularizou os Hooks." loading="lazy" />
  <figcaption>
    O logo do React, a biblioteca JavaScript de código aberto que popularizou os Hooks. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AReact-icon.svg">React-icon.svg</a> por Facebook —
    <a href="https://en.wikipedia.org/wiki/Public_domain">Public domain</a> · via Wikimedia Commons
  </figcaption>
</figure>

## useEffect com cleanup e dependências

### O que o `useEffect` realmente faz?

O `useEffect` substitui os métodos de ciclo de vida das classes (`componentDidMount`, `componentDidUpdate`, `componentWillUnmount`). Ele aceita **duas** coisas:

```tsx
useEffect(() => {
  // efeito colateral (side‑effect)
  return () => {
    // função de limpeza (cleanup)
  };
}, [/* lista de dependências */]);
```

- O **primeiro argumento** é a função que será executada **após** a renderização.
- O **valor retornado** (se houver) será chamado **antes** da próxima execução do efeito ou quando o componente for desmontado.
- O **segundo argumento** (array de dependências) controla *quando* o efeito deve ser re‑executado.

### Exemplo 1 – Fetch de dados com cancelamento

Imagine um componente que busca detalhes de um usuário ao montar. Se o usuário navegar para outra página antes da requisição terminar, precisamos abortar a chamada para evitar *memory leaks* e atualizações de estado em componentes desmontados.

```tsx
import { useEffect, useState } from 'react';

function useUser(id: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController(); // <-- permite cancelar

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

    // cleanup: aborta a requisição se o componente desmontar ou id mudar
    return () => controller.abort();
  }, [id]); // <-- dependência correta

  return { user, loading, error };
}
```

**Dicas práticas**

- **Sempre inclua as variáveis usadas dentro do efeito** (`id` no exemplo) na lista de dependências. O ESLint plugin `react-hooks/exhaustive-deps` ajuda a detectar ausências.
- **AbortController** funciona em navegadores modernos e em Node (via `node-fetch`). Se precisar de suporte a navegadores legados, use bibliotecas como `axios` que já possuem cancelamento interno.

### Exemplo 2 – `setInterval` com cleanup

Um contador que incrementa a cada segundo parece simples, mas se não limparmos o intervalo, o timer continuará rodando mesmo após o componente ser desmontado.

```tsx
import { useEffect, useState } from 'react';

export function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    // cleanup
    return () => clearInterval(id);
  }, []); // [] garante que o intervalo seja criado apenas uma vez

  return <p>Tempo decorrido: {seconds}s</p>;
}
```

**Ponto de atenção**: se você colocar `seconds` na lista de dependências, o efeito será recriado a cada atualização, gerando múltiplos timers. Por isso, use a forma funcional do `setState` (`s => s + 1`) para acessar o valor mais recente sem precisar listar `seconds` como dependência.

### Quando usar múltiplos `useEffect`

Não há problema algum em dividir a lógica em vários efeitos, cada um responsável por uma preocupação diferente. Isso aumenta a legibilidade e evita *over‑engineering* de dependências.

```tsx
useEffect(() => {
  // efeito A – escuta eventos de resize
  const onResize = () => console.log(window.innerWidth);
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}, []); // efeito A não depende de props/state

useEffect(() => {
  // efeito B – busca dados quando `userId` mudar
  fetchUser(userId);
}, [userId]); // efeito B depende apenas de userId
```

---  

## useRef para acessar DOM e valores persistentes

### O que o `useRef` realmente armazena?

- **Referência ao DOM** – muito usado para focar inputs, medir elementos ou integrar bibliotecas de terceiros.
- **Valor mutável que persiste entre renders** – ao contrário de `useState`, mudar `ref.current` **não** dispara nova renderização.

### Exemplo 1 – Focar um campo de texto ao montar

```tsx
import { useEffect, useRef } from 'react';

export function SearchBox() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus(); // garante que o input receba foco
  }, []); // roda só na montagem

  return <input ref={inputRef} placeholder="Buscar..." />;
}
```

### Exemplo 2 – Guardar o valor anterior de uma prop

Muitas vezes precisamos comparar o valor atual de uma prop com o anterior (por exemplo, para disparar animações). `useRef` permite armazenar o “valor anterior” sem causar re‑render.

```tsx
import { useEffect, useRef } from 'react';

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]); // atualiza a cada mudança
  return ref.current;
}

// Uso no componente
export function PriceTag({ price }: { price: number }) {
  const prevPrice = usePrevious(price);
  const changed = prevPrice !== undefined && price !== prevPrice;

  return (
    <div>
      <span>Preço: R$ {price.toFixed(2)}</span>
      {changed && <em> (alterado de R$ {prevPrice?.toFixed(2)})</em>}
    </div>
  );
}
```

### Exemplo 3 – Contador de renderizações sem re‑render

```tsx
import { useRef } from 'react';

export function RenderCounter() {
  const renders = useRef(0);
  renders.current += 1; // incrementa a cada render

  return <p>Renderizações: {renders.current}</p>;
}
```

> **Curiosidade:** Se você quiser que o valor seja exibido na UI, ainda precisará de `useState` (ou `useReducer`). O `useRef` serve aqui apenas como *instrumento de medição*.

### Dicas avançadas

1. **Evite usar `ref` como “state”** – mudar `ref.current` não atualiza a UI. Se a UI depende do valor, use `useState`.
2. **Referências a componentes de terceiros** – ao integrar com bibliotecas como `Chart.js` ou `Mapbox`, crie o canvas ou container com `ref` e inicialize a biblioteca dentro de um `useEffect` com cleanup que destrua a instância.
3. **Persistência entre rotas** – `useRef` pode guardar dados temporários que não precisam ser serializados no URL nem no `localStorage`. Ideal para armazenar “caches” de API que não justificam persistência completa.

---  

## Custom Hooks reais que você precisa conhecer

Criar *custom hooks* é a arte de **extrair lógica reutilizável** e **isolar side‑effects**. Quando bem projetados, eles tornam o código mais declarativo e testável.

### 1. `useFetch` – Busca genérica com estado de loading e erro

```tsx
import { useEffect, useState } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook genérico para requisições GET.
 * @param url URL da API
 * @param options Opções de fetch (headers, etc.)
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
        if (!res.ok) throw new Error(`Erro ${res.status}`);
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
  }, [url, JSON.stringify(options)]); // atenção ao serializar opções

  return state;
}
```

**Como usar**

```tsx
function UsersList() {
  const { data: users, loading, error } = useFetch<User[]>('/api/users');

  if (loading) return <p>Carregando...</p>;
  if (error) return <p>Erro: {error}</p>;

  return (
    <ul>
      {users?.map(u => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}
```

> **Dica:** Sempre inclua `JSON.stringify(options)` nas dependências se quiser que mudanças em headers ou query params reinicializem a requisição. Caso as opções sejam estáticas, passe um objeto memoizado com `useMemo`.

### 2. `useLocalStorage` – Sincroniza estado com `localStorage`

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
      // falha silenciosa – pode ser quota excedida
    }
  }, [key, value]);

  return [value, setValue] as const;
}
```

**Uso típico**

```tsx
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('app-theme', 'light');

  return (
    <button onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}>
      Tema: {theme}
    </button>
  );
}
```

**Boas práticas**

- **Persistência seletiva** – nem todo estado merece ficar no `localStorage`. Avalie se o dado será reutilizado entre sessões.
- **Versionamento** – ao mudar a estrutura do objeto armazenado, considere limpar a chave ou migrar os dados para evitar `JSON.parse` falho.

### 3. `useDebounce` – Debounce de valores ou callbacks

Ideal para buscas “type‑ahead”, onde queremos esperar o usuário parar de digitar antes de disparar a requisição.

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

**Exemplo de uso**

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
        placeholder="Buscar produtos..."
      />
      {loading && <p>Carregando...</p>}
      <ul>
        {results?.map(p => (
          <li key={p.id}>{p.title}</li>
        ))}
      </ul>
    </>
  );
}
```

**Truque avançado:** Se precisar de *debounce* de *funções* (não apenas valores), combine `useCallback` com `useRef`:

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

## Erros comuns e como evitá‑los

| Erro | Por que acontece | Como corrigir |
|------|------------------|----------------|
| **Dependências incompletas no `useEffect`** | O ESLint pode ser desativado ou ignorado; desenvolvedores acham que “não muda, então não preciso”. | Deixe o plugin `react-hooks/exhaustive-deps` ativo. Quando a dependência é um objeto ou função, use `useMemo` ou `useCallback` para estabilizá‑la. |
| **Loop infinito de renders** | `useEffect` que altera estado que está na sua própria lista de dependências. | Separe a lógica: use um `useRef` para armazenar valores que não precisam disparar re‑render, ou mova a atualização de estado para outro efeito que não dependa do mesmo valor. |
| **Stale closure (fechamento com valores antigos)** | Funções criadas dentro do efeito capturam o estado no momento da criação e não são atualizadas. | Inclua as variáveis no array de dependências ou use a forma funcional de `setState` (`setCount(c => c + 1)`). |
| **Uso indevido de `useRef` como estado** | Alterar `ref.current` não dispara render, levando a UI desatualizada. | Quando a UI depende do valor, use `useState`. Reserve `useRef` para “armazenamento mutável” ou acesso ao DOM. |
| **Custom Hook que não limpa recursos** | Bibliotecas externas (ex.: `Chart.js`, `WebSocket`) permanecem ativas após desmontar. | Sempre retorne uma função de limpeza no `useEffect` interno do hook. |
| **Serialização de objetos complexos nas dependências** | `useEffect([obj])` sempre cria novo efeito, pois `obj` tem referência diferente a cada render. | Use `useMemo(() => obj, [obj.prop1, obj.prop2])` ou transforme o objeto em string (`JSON.stringify`) se for pequeno e estável. |
| **Excesso de abstração** | Criar hooks para tudo pode gerar camadas desnecessárias

## Fontes

- [MDN: Hooks Reference](https://developer.mozilla.org/en-US/docs/React/Hooks)
- [React Docs: useEffect](https://react.dev/reference/react/useEffect)
- [React Docs: useRef](https://react.dev/reference/react/useRef)
- [Kent C. Dodds: Custom Hooks](https://kentcdodds.com/blog/how-to-use-react-hooks-effectively)

## 📸 Crédito da imagem de capa
- **Imagem:** [Programming.jpg](https://commons.wikimedia.org/wiki/File%3AProgramming.jpg)
- **Autor(a):** Lorenzo Cafaro
- **Licença:** [CC0](https://creativecommons.org/publicdomain/zero/1.0/) · via Wikimedia Commons
