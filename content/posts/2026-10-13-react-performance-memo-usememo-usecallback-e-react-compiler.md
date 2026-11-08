---
title: "React performance: memo, useMemo, useCallback e React Compiler"
date: "2026-10-13"
category: "article"
tags: ["react", "performance", "otimizacao"]
excerpt: "Quando memoizar, como o React Compiler muda o jogo e como medir o impacto real com o Profiler."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-10-13-react-performance-memo-usememo-usecallback-e-react-compiler.jpg"
comments: true
translationKey: "2026-10-13-react-performance-memo-usememo-usecallback-e-react-compiler"
---

## Introdução: quando a otimização se torna necessária

Quando uma lista cresce e a cada interação o navegador trava ou pisca, o problema raramente é "falta de poder de CPU". Na maioria dos casos, é renderização desnecessária no React. Entender quando memoizar, como o React Compiler ajuda e onde usar `useMemo` e `useCallback` faz a diferença entre uma interface fluida e uma frustrante.

A dor aparece no Chrome DevTools: centenas de componentes renderizando em cascata, muitos deles recebendo novas props mesmo quando a consulta de fundo não retornou novos dados. A primeira tentativa costuma ser envolver tudo com `React.memo`, mas isso apenas mascara o sintoma — as renderizações desnecessárias continuam ocorrendo no nível mais profundo.

Esse padrão surge sempre que componentes recalculam expressões caras, criam novos objetos e funções a cada render ou recebem props que mudam de identidade sem mudar de valor. O resultado é uma cascata de re-renderizações que pode ser evitada com as ferramentas certas.

Otimização não é um passo opcional "quando sobra tempo". É uma resposta direta a um problema real: reduzir a latência percebida melhora a experiência do usuário e reduz custo de infraestrutura. A seguir, as ferramentas que transformam uma interface reativa em uma interface responsiva, com exemplos que você pode reproduzir.

## React.memo: evitando renderizações desnecessárias

`React.memo` é um wrapper de alto nível que memoiza o resultado de um componente funcional. Se as props não mudarem, o React reutiliza o último resultado, evitando um ciclo completo de render e commit. Na prática, uma grade de produtos pode sobreviver a uma busca digitada rapidamente, desde que a lista em si permaneça inalterada.


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-10-13-react-performance-memo-usememo-usecallback-e-react-compiler-1.jpg" alt="React performance: memo, useMemo, useCallback e React Compiler" loading="lazy">
<figcaption>Don Edwards San Francisco Bay National Wildlife Refuge. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AACE_EMD_F40PH_Fremont_-_San_Jose.jpg">ACE EMD F40PH Fremont - San Jose.jpg</a> por Kabelleger / David Gubler (http://www.bahnbilder.ch) — <a href="https://creativecommons.org/licenses/by-sa/3.0">CC BY-SA 3.0</a> · via Wikimedia Commons</figcaption>
</figure>

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-10-13-react-performance-memo-usememo-usecallback-e-react-compiler.jpg" alt="React performance: memo, useMemo, useCallback e React Compiler" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>

Considere um componente `<ProductGrid>` que recebe duas props: `items` (o array filtrado) e `onSelect` (um manipulador de clique). O manipulador é uma função de seta que não depende de dados externos, então sua identidade permanece estável se for criada fora do componente. Como `items` é uma nova referência a cada digitação (porque a string de consulta é transformada em um novo array), o memo ainda dispara uma renderização — mas apenas para a grade, e não para toda a árvore de layout acima dela.

O ganho real aparece quando você combina `React.memo` com um gerenciamento de estado mais granular. Manter o conjunto de seleção separado do array de itens, por exemplo com `useReducer`, evita que a seleção de um item force a grade inteira a renderizar de novo.

Um erro comum é envolver *tudo* com `React.memo` sem análise. Memoizar cada item de uma lista individualmente aumenta o consumo de memória, porque cada componente memoizado mantém seu próprio cache de elementos React. Na maioria dos casos, apenas o contêiner (a lista) precisa ser memoizado, enquanto os itens internos permanecem funcionais.

Em resumo, `React.memo` funciona melhor quando existe um limite claro de quais props realmente afetam a saída visual. Use-o como primeiro nível de defesa, não como solução para todo componente.

## useMemo: cache de cálculos pesados

`useMemo` armazena o resultado de uma expressão cara entre renders. A utilidade é mais evidente quando o cálculo é mais caro que uma simples atribuição — ordenação, filtragem ou agregação de um array grande, por exemplo.

```js
// antes
const sortedItems = items
  .filter(...)
  .sort((a, b) => b.score - a.score);

// depois
const sortedItems = useMemo(() => (
  items
    .filter(...)
    .sort((a, b) => b.score - a.score)
), [items, query, sortKey]);
```

O array de dependências é crucial. Se `items` é regenerado a cada digitação (devido à transformação da consulta), incluí-lo na lista garante que o valor memoizado seja descartado quando a fonte muda. Isso também evita um problema de atualização atrasada: se você omitir uma dependência por acidente, o valor antigo pode continuar visível após uma mudança de dados.

Outro caso clássico é renderizar estruturas profundas, como um visualizador de JSON com milhares de entradas. Renderizar cada nó recursivamente a cada scroll é proibitivamente lento; envolver os níveis de recursão com `useMemo` garante que apenas os nós visíveis sejam reavaliados.

`useMemo` vale quando a expressão custa mais que um simples `Array.prototype.map`. Se você só está mapeando um array de strings para JSX, o custo é insignificante e o memo pode até adicionar sobrecarga. Um perfil rápido no React DevTools mostra onde a memoização traz benefício real: ordenação, transformação de dados e renderização recursiva de árvores profundas.

## useCallback: quando a estabilidade de referência importa

`useCallback` memoiza funções para que a identidade permaneça a mesma entre renders. O objetivo é evitar que um novo manipulador force um componente filho memoizado a renderizar de novo.


Um caso típico: um `<CartButton>` envolvido com `React.memo` recebe um manipulador `onAddToCart`. Se o manipulador é uma função de seta definida dentro do componente pai, ele ganha uma nova referência a cada render, e a comparação de props sempre falha — o memo nunca ajuda.

```js
// problema
const handleAdd = () => { /* lógica */ };

// solução
const handleAdd = useCallback(() => { /* lógica */ }, []);
```

Se `handleAdd` precisasse de valores de estado, esses valores entrariam na lista de dependências. Quando o manipulador não acessa nenhum estado do React, uma lista vazia é suficiente.

Há uma armadilha comum: o "stale closure". Você passa um manipulador para um componente filho, o filho o armazena em um closure e o expõe mais tarde — criando um ciclo de referência que anula o propósito da memoização. A solução é extrair a lógica para uma função pura fora do componente e então envolver essa função com `useCallback`. A identidade permanece estável e o ciclo se quebra.

Use `useCallback` quando um manipulador for passado a um componente memoizado ou armazenado em estado que dispara um efeito. Use `useMemo` para valores computados que você precisa comparar ou armazenar. Misturar os dois incorretamente gera uma falsa sensação de segurança e mais uso de memória.

## React Compiler: o que é e por que importa

O React Compiler altera o modelo mental de quando a memoização é necessária. Ele analisa a árvore de componentes e decide automaticamente onde aplicar `React.memo`, `useMemo` e `useCallback`. O objetivo é permitir componentes funcionais mais limpos sem sacrificar performance.

Um exemplo prático é um componente `<LazySection>` que renderiza um bloco pesado só depois de um clique em "Expandir". Antes do compilador, era preciso envolver o componente com `React.memo` e gerenciar estado de suspensão manualmente. Com o compilador habilitado, o mesmo código funciona sem declarações extras de memoização: ele detecta que o componente não renderiza no mount inicial e insere o caminho necessário.

O compilador trabalha melhor com a sintaxe moderna de hooks, sem hooks em componentes de classe, e se integra ao React DevTools para exibir a árvore de memoização. Mas não é solução mágica: ainda é preciso escrever componentes puros e evitar efeitos colaterais na fase de render. Um `useEffect` que busca dados do backend precisa continuar explícito — o compilador não pode inferir que esse efeito deve ser ignorado.

Uma armadilha é que o compilador pode ser agressivo demais com componentes que dependem de contexto. Com um `ThemeContext`, por exemplo, o objeto de contexto é uma nova referência a cada render do provedor, o que provoca renderizações desnecessárias em toda a árvore. A correção costuma ser memoizar o valor do provedor (`useMemo` no objeto de contexto) ou separar contextos por responsabilidade.

Em resumo, o React Compiler reduz a necessidade de declarações manuais, mas os limites continuam os mesmos: componentes puros, efeitos estáveis e dependências estáveis.

## Profiler no DevTools: medindo o real impacto

Depois de aplicar `React.memo`, `useMemo` e `useCallback`, o próximo passo é validar se as mudanças reduziram de fato o trabalho de renderização. O React DevTools Profiler registra cada renderização de componente, com tempo de CPU, tempo de render e renderizações adicionais.

Um teste A/B simples ajuda: compare a grade sem memoização com a versão memoizada, medindo o tempo por digitação. É comum ver ganhos grandes — de ~120 ms para ~38 ms por tecla, por exemplo — mas também um aumento no uso de memória, que só aparece depois de alguns minutos de execução. Meça os dois lados antes de comemorar.

O profiler também revela problemas ocultos. Uma lista de artigos que parece renderizar demais pode ter como causa um `useEffect` que reconstrói um índice de busca a cada mudança; mover esse índice para `useMemo` elimina vários picos por ciclo.

Use o profiler com moderação. Execuções longas distorcem os números; capture um perfil que represente um fluxo típico de usuário. Em conjuntos grandes, é comum descobrir que a maior parte do tempo de CPU é gasta reavaliando nós fora do viewport — o que pede memoização na função de renderização recursiva ou limitação da profundidade ao que está visível.

Por fim, o profiler mostra renderizações extras causadas por atualizações de contexto ou máquinas de estado mal construídas. Um reducer que cria um novo objeto de ação a cada dispatch faz toda a árvore comparar referências novas; retornar referências estáveis elimina o problema.

Sem medir, você pode estar adicionando código desnecessário ou perdendo um gargalo oculto.

## Anti-patterns: quando otimizar demais ou de forma errada

Otimização é um processo iterativo. Começar com uma solução excessiva gera código difícil de manter. Alguns anti-patterns comuns:

Primeiro: "tudo é memoizado". Envolver cada card de uma lista com `React.memo` adiciona overhead de memória e complexidade sem ganho. O componente é pequeno demais para justificar o custo; mover o memo para o contêiner simplifica a árvore e reduz o consumo de memória.

Segundo: `useMemo` para operações baratas. Envolver um simples `array.map` que gera JSX adiciona uma etapa de cache a cada render sem ganho. Se a expressão custa menos que um tick de `requestIdleCallback`, o memo é desnecessário.

Terceiro: esquecer de atualizar as listas de dependências. Recriar um objeto de filtros a cada digitação e usá-lo em `useMemo` faz com que o valor memoizado nunca seja reaproveitado, levando a filtros desatualizados. A correção é estabilizar o objeto (por exemplo, com `useReducer`) para que ele só mude quando a chave primária mudar.

Quarto: supor que `useCallback` sozinho resolve tudo. Um manipulador de arrastar e soltar passado a um `<DragHandle>` memoizado pode continuar causando renders se o closure lê um valor mutável de um ref que muda a cada frame. Extrair o manipulador para uma função pura que lê o ref dentro do corpo resolve.

Por último: confiar apenas no React Compiler. Se um componente busca um valor dinâmico a cada render como efeito colateral, o compilador não tem como saber disso e pode preservar o comportamento indesejado. Efeitos precisam ser explícitos.

O padrão geral é: comece simples, profile, identifique o gargalo e aplique a ferramenta mais granular que resolve o problema sem afetar componentes não relacionados.

## Conclusão: uma filosofia de performance

Performance no React não se resume a "usar mais hooks". É uma combinação de entender o fluxo de dados, conhecer as ferramentas e ter paciência para medir antes de agir. Memoização de componentes de nível superior, `useMemo` para cálculos pesados e `useCallback` para referências estáveis costumam reduzir o tempo de render por entrada de usuário de mais de 100 ms para menos de 30 ms.

O React Compiler adiciona outra camada de abstração, permitindo componentes mais limpos e delegando ao compilador a memoização granular. Ainda assim, componentes puros, efeitos estáveis e dependências estáveis continuam sendo pré-requisitos. E o Profiler segue sendo a única forma confiável de validar se a otimização funciona.

Um aspecto frequentemente esquecido é o custo de manutenção do estado. Mover o conjunto de seleção para um reducer dedicado mantém a identidade do manipulador de clique estável, o que melhora performance e torna o fluxo de ações previsível. Ajustes pequenos na criação de ações estáveis eliminam renderizações extras que passavam despercebidas.

Otimização excessiva prejudica a legibilidade. Um componente demasiado memoizado vira um labirinto de hooks e fica difícil entender por que ele renderiza. O objetivo é o menor granularidade possível, sempre com perfil antes de otimizar.

As mesmas preocupações se estendem ao backend: menos renders no front-end significam menos requisições à API, o que reduz carga no servidor e custo de infraestrutura.

## Takeaways práticos

- Comece medindo. Use o Profiler para identificar quais componentes consomem mais tempo de CPU antes de adicionar qualquer memoização.
- Aplique `React.memo` apenas quando as props afetam o resultado visual; evite envolver componentes pequenos e de folha.
- Use `useMemo` para expressões caras (ordenação, filtragem, computação pesada) e mantenha a lista de dependências precisa.
- Estabilize manipuladores com `useCallback` quando forem passados para componentes memoizados ou armazenados em estado que dispara efeitos.
- O React Compiler reduz a necessidade de declarações manuais, mas componentes puros e estáveis continuam necessários.
- Monitore CPU e memória: o ganho de velocidade às vezes vem com custo de memória.
- Mantenha o código simples. Otimize apenas o que o perfil aponta como gargalo.
- Teste em conexões reais. Um componente rápido no laptop pode ser gargalo em rede móvel.

---

## Fontes

- Documentação oficial do React: Hooks
  https://react.dev/reference/react
- React DevTools Profiler
  https://react.dev/learn/profile-your-react-application
- React Compiler
  https://react.dev/learn/react-compiler
- MDN: `Array.prototype.sort`
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
- Documentação do `React.memo`
  https://react.dev/reference/react/memo
- Documentação do `useMemo`
  https://react.dev/reference/react/useMemo
- Documentação do `useCallback`
  https://react.dev/reference/react/useCallback
