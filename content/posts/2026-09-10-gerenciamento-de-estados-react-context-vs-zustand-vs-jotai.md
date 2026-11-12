---
title: "Gerenciamento de estados: React Context vs Zustand vs Jotai"
date: "2026-09-10"
category: "article"
tags: ["react", "state", "zustand", "jotai"]
excerpt: "Gerenciamento de estados: React Context vs Zustand vs Jotai."
share_hook: "Context, Zustand ou Jotai? Comparação de performance de verdade e o momento em que o Context deixa de bastar."
cover:
  image: "/covers/2026-09-10-gerenciamento-de-estados-react-context-vs-zustand-vs-jotai.jpg"
comments: true
translationKey: "2026-09-10-gerenciamento-de-estados-react-context-vs-zustand-vs-jotai"
---


Você já passou uma tarde inteira debugando uma atualização que não disparava reação no componente, só para descobrir que o problema estava no `useMemo` que envolveu seu contexto? Ou já viu um projeto crescer até o ponto em que qualquer mudança num estado global acaba afetando metade da árvore de componentes? Gerenciamento de estado em React não é só sobre guardar dados: é sobre prevenir esses choques de realidade que te fazem questionar sua carreira.

O React é poderoso, mas ele não vem com uma solução pronta para o que acontece quando o `useState` começa a vazar pelo app inteiro. Com o tempo, você percebe que state management não é um *nice to have*: é o que separa um código sustentável de uma estrutura que desaba com a primeira feature nova.

Sincronizar catálogo e estoque entre um sistema e marketplaces parece simples à primeira vista: um estado global para o carrinho e outro para o estoque. Mas quando entram atualizações concorrentes, retry automático e múltiplos endpoints, o estado complica. É aí que vale conhecer alternativas ao Context.

Vou comparar três abordagens que encontrei na prática: React Context (a nativa), Zustand (a minimalista) e Jotai (a atômica). Nada de teoria pura: o que funciona, o que dói e em que cenário cada um se comporta bem.

## Quando o contexto já não é suficiente

O React Context é nativo, não precisa de dependências externas e funciona. É verdade. Mas funciona bem?

O Context é ótimo para valores que mudam raramente: temas, autenticação, configurações globais. Por exemplo, num projeto de ONG que fiz (Mensageiros da Esperança), o contexto serve bem para armazenar o usuário logado e permissões: mudam só no login/logout.

O problema surge quando você tenta usar o Context para estado que muda com frequência: inputs de formulários, listas de produtos em carrinho, status de carregamento. Cada atualização disso dispara re-renders em todos os consumidores, mesmo que o valor consumido por aquele componente específico não tenha mudado. É o famoso "over-rendering".

Num dos meus primeiros projetos com React (um dashboard para ricing Linux), comecei com Context para tudo. O resultado? Quando o usuário mudava o slider de transparência do Hyprland (sim, isso era um estado no app), o app inteiro re-renderizava, e isso incluía listas de pacotes, previews de temas, configurações. Não era sustentável.

O Context é simples de entender, mas sua implementação interna (o provider como componente com estado próprio) cria uma dependência de renderização que muitas vezes é mais pesada do que parece.

## Zustand: API simples, resultados reais

Zustand surgiu como resposta a essa complexidade. Sua API é mínima: basicamente, você cria um store com `create`, passa um estado inicial e mutações. Não precisa de providers, não precisa de hooks complexos, nem memoização manual.


<figure>
<img src="/media/2026-09-10-gerenciamento-de-estados-react-context-vs-zustand-vs-jotai-1.jpg" alt="Gerenciamento de estados: React Context vs Zustand vs Jotai" loading="lazy">
<figcaption>Chemist Tesia Irwin tests a 3D printer on July 28, 2022, at Swamp Works at NASA’s Kennedy Space Center in Florida, as part of the Relevant Environment Additive. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AREACT_Demonstration_%28KSC-20220728-PH-FMX02_0029%29.jpeg">REACT Demonstration (KSC-20220728-PH-FMX02 0029).jpeg</a> por Frank Michaux — <a href="https://creativecommons.org/licenses/">Public domain</a> · via Wikimedia Commons</figcaption>
</figure>

```ts
// Exemplo prático: gerenciamento de estoque
import { create } from 'zustand';

interface StockState {
  items: Record<string, number>; // SKU -> quantidade
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

O Zustand é prático quando é preciso de estado global fácil de testar e persistir. Com middleware como `persist`, é possível salvar o estado no localStorage — útil quando a sincronização com APIs externas falha.

Uma coisa que me chamou atenção: o Zustand evita o "wrapper hell" do Context. Você usa o hook direto no componente, sem precisar aninhar providers ou se preocupar com renderizações desnecessárias. O seletor do `useStore` permite pegar só o que o componente precisa:

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

O `shallow` (do `zustand/shallow`) compara referências superficialmente: importante quando você retorna objetos ou arrays no seletor. Isso evita re-renders mesmo que o restante do estado mude.

## Jotai: estado atômico, sem complicações

Jotai segue outro princípio: estado atômico. Em vez de um único objeto grande, você divide o estado em pequenas unidades ("atoms") que podem ser combinadas livremente.

```ts
// Exemplo prático: gerenciamento de tarefas
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

Em um dashboard com múltiplos provedores e configurações independentes, Jotai funciona bem. É possível criar átomos por provedor, como `providerStatusAtom(providerId)`, `providerConfigAtom(providerId)`, sem centralizar tudo em um objeto gigante.

A parte mais legal é a composição: `filteredTasksAtom` é automaticamente recalculado sempre que `tasksAtom` ou `filterAtom` mudam. Não precisa de `useMemo`, `useSelector`, ou lógica extra. O Jotai já sabe quais dependências cada atom tem e recalcula apenas o necessário.

Para componentes, usa-se o `useAtomValue` ou `useAtom`:

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

E se você precisa mutar? O Jotai tem atoms mutáveis (com `write`), mas recomenda-se preferir atoms derivados sempre que possível. Isso tira a tentação de colocar lógica imperativa direto no estado.

O Jotai funciona bem para estado de UI (abas abertas, filtros, seleção). A lógica de persistência pode ficar separada em hooks ou serviços, mantendo responsabilidades bem definidas.

## Comparando performance

Performance não é só sobre quantos ms leva para atualizar: é sobre quantos componentes re-renderizam, quantas verificações de igualdade são feitas e como o garbage collector se sente.


<figure>
<img src="/media/2026-09-10-gerenciamento-de-estados-react-context-vs-zustand-vs-jotai-2.jpg" alt="Gerenciamento de estados: React Context vs Zustand vs Jotai" loading="lazy">
<figcaption>Chemist Tesia Irwin tests a 3D printer on July 28, 2022, at Swamp Works at NASA’s Kennedy Space Center in Florida, as part of the Relevant Environment Additive. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AREACT_Demonstration_%28KSC-20220728-PH-FMX02_0030%29.jpeg">REACT Demonstration (KSC-20220728-PH-FMX02 0030).jpeg</a> por Frank Michaux — <a href="https://creativecommons.org/licenses/">Public domain</a> · via Wikimedia Commons</figcaption>
</figure>

No contexto tradicional (sem memoização), cada atualização de contexto dispara re-renders em todos os componentes que consumem aquele contexto, mesmo que o valor específico usado por cada um não mude. O React não tem como saber disso, já que o objeto retornado pelo provider é novo a cada render.

Zustand evita isso com o hook `useStore` que usa referência de estado interno (via `useSyncExternalStore`) e comparação seletiva. Só quem usa o estado modificado re-renderiza. Em testes com listas de 100+ itens, o Zustand manteve 60fps mesmo com atualizações frequentes.

Jotai brilha quando você tem muitos átomos interdependentes. Cada atom sabe quais outros atoms ele lê, então só recalcula os derivados que precisam. Num cenário de filter + search + pagination (como num dos meus testes de protótipo), Jotai re-renderizou apenas o necessário: a lista, não os filtros.

Mas cuidado com abuso de atoms derivados em cascata. Se você tiver 10 níveis de `atom((get) => get(anotherAtom))`, cada mudança no fundo dispara recálculo em todos. Jotai é rápido, mas não mágico.

Context sem memoização: lento. Context com `useMemo` em cada provider e `React.memo` em cada consumidor: trabalhoso, mas possível. Zustand/Jotai: menos código, menos surpresas.

## Quando usar cada um

**React Context:**
- Valores estáticos ou que mudam raramente (auth, tema, configurações globais)
- Projetos pequenos onde a simplicidade de não ter dependências pesa mais que performance
- Quando você já tem uma árvore de componentes complexa e não quer reescrever

**Zustand:**
- Estado global que muda com frequência (carrinhos, formulários, listas)
- Quando você quer uma API simples e direta
- Para projetos onde testabilidade e persistência são importantes
- Quando você precisa de middleware personalizado (persist, logger, middleware de API)

**Jotai:**
- Estados complexos com muitos valores interdependentes (dashboards, ferramentas de edição)
- Quando você quer evitar state nesting e preferir composição
- Para componentes que precisam de múltiplos valores independentes
- Quando performance de atualização específica é crítica (ex: grids grandes, listas com drag-and-drop)

É comum combinar Zustand para estado global do fluxo e Jotai para formulários com muitos campos e validações. Os dois se complementam bem.

## O que fazer se já usa Context?

Migração não precisa ser de um dia para o outro. Você pode fazer por camadas.

1. **Identifique os contextos problemáticos:** aqueles que causam re-renders em cascata, ou que você precisou memoizar manualmente várias vezes.

2. **Extraia para um store:** pegue o valor do contexto e crie um Zustand/Jotai equivalente. Não mude nada no componente ainda.

3. **Substitua o consumo um por um:** comece pelos componentes mais simples. Se você usa `useContext(MyContext)` e o valor é usado direto, mude para `useMyStore((s) => s.value)`.

4. **Use middleware para migração:** Zustand tem `persist` que lê JSON antigo do localStorage, então você pode migrar valores antigos de Context para Zustand sem perder estado.

Começar com Context funciona bem para carrinhos simples. Quando a lista de produtos cresce e passa de algumas centenas de itens, os re-renders ficam perceptíveis. Migrar para uma solução como Zustand traz ganhos de performance com menos boilerplate.

A parte mais fácil de migrar foi a persistência: o Context já salva carrinho em localStorage. No Zustand, só adicionei `middleware: persist` e ajustei a chave. Pronto.

## Conclusão

State management em React não é sobre escolher o mais popular: é sobre escolher o que resolve o seu problema, com o mínimo de complexidade.

- **Context** ainda é a opção mais simples para estados estáveis e valores que não mudam com frequência. Mas não se engane: com estado dinâmico, ele pode se tornar um pesadelo de performance.

- **Zustand** é a minha escolha padrão hoje: API simples, performance boa, flexível o suficiente para middleware customizado. É o "middle ground" entre minimalismo e poder.

- **Jotai** brilha em aplicações onde o estado é naturalmente modular: dashboards, ferramentas de edição, qualquer coisa com muitos valores interdependentes.

No fim das contas, o melhor state management é aquele que você entende e consegue manter. Não vale trocar Zustand por Context só porque é nativo, ou vice-versa. Mas saber quando cada um faz sentido? Isso sim faz a diferença entre um projeto que escala e um que colapsa com a primeira feature nova.

### Takeaways práticos

- Comece com `useState` local e contextos simples. Migre quando a dor for real, não antes.
- Se você precisa de persistência ou middleware, Zustand compensa mais.
- Para estados complexos com muitas derivadas, Jotai evita re-renders em cascata.
- Nunca use contexto sem memoização para estado que muda com frequência, ou use `useContext` com `useMemo` no provider e `React.memo` nos consumidores (mas isso já tira a simplicidade).
- Teste performance com DevTools Profiler: veja quantos componentes re-renderizam com uma atualização.

O state management é invisível até quando quebra. Investir tempo em escolher certo vale mais que escolher "certo" hoje e ter que reescrever amanhã.

## Fontes

- [React Docs: Context](https://react.dev/reference/react/createContext)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Jotai GitHub](https://github.com/pmndrs/jotai)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Jotai Documentation](https://jotai.org/)
- [React Docs: useMemo](https://react.dev/reference/react/useMemo)
## 📸 Crédito da imagem de capa
- **Imagem:** [Infrared photography of computer hardware - DSC05331.jpg](https://commons.wikimedia.org/wiki/File%3AInfrared_photography_of_computer_hardware_-_DSC05331.jpg)
- **Autor(a):** Smrao
- **Licença:** [CC0](https://creativecommons.org/publicdomain/zero/1.0/) · via Wikimedia Commons
