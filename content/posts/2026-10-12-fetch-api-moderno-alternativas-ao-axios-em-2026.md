---
title: "Fetch API moderno: alternativas ao axios em 2026"
date: "2026-10-12"
category: "article"
tags: ["javascript", "fetch", "api"]
excerpt: "Fetch API moderno: alternativas ao axios em 2026."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-10-12-fetch-api-moderno-alternativas-ao-axios-em-2026.jpg"
lang: "pt"
comments: true
translationKey: "2026-10-12-fetch-api-moderno-alternativas-ao-axios-em-2026"
---

## Fetch API moderno: alternativas ao axios em 2026

Em um mundo onde APIs são fundamentais para a construção de aplicações web responsivas e dinâmicas, a eficiência nas requisições HTTP é um assunto cada vez mais relevante. O Axios, uma das bibliotecas mais populares para esse fim, foi um grande aliado para muitos desenvolvedores ao longo dos anos. No entanto, com o avanço do JavaScript e as melhorias no Fetch API, surgem novas alternativas e abordagens que podem tornar o desenvolvimento ainda mais ágil e eficiente.

### Fetch nativo: o que mudou

O Fetch API, introduzido no JavaScript moderno, trouxe uma nova forma de lidar com requisições HTTP de maneira nativa, eliminando a necessidade de bibliotecas externas como o Axios em muitos casos. Uma das principais mudanças é a forma como os dados são manipulados. O Fetch API retorna uma `Promise` que resolve com um objeto `Response`, o que permite um controle mais eficiente sobre o resultado da requisição.

Um exemplo básico de uso do Fetch API é o seguinte:

```javascript
fetch('https://api.example.com/data')
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => console.log(data))
  .catch(error => console.error('There was a problem with the fetch operation:', error));
```

Com o Fetch API, o tratamento de erros se torna mais explícito, permitindo que o desenvolvedor lide com diferentes estados da requisição de maneira mais clara.

### Interceptores

Um dos recursos que o Axios oferece, que nem sempre é imediatamente evidente no Fetch API, são os interceptores. Interceptores permitem que você manipule requisições ou respostas antes que elas sejam tratadas pela lógica da sua aplicação. Isso pode incluir a adição de headers, manipulação de erros, entre outros.

Para implementar um comportamento semelhante ao de interceptores no Fetch API, você pode criar uma função que encapsule a chamada de fetch:

```javascript
const fetchWithInterceptors = async (url, options = {}) => {
  // Adicionar cabeçalhos ou manipular opções aqui
  options.headers = {
    ...options.headers,
    'Authorization': 'Bearer token'
  };

  const response = await fetch(url, options);
  
  // Manipular a resposta
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message);
  }
  
  return response.json();
};

// Uso da função com interceptores
fetchWithInterceptors('https://api.example.com/data')
  .then(data => console.log(data))
  .catch(error => console.error(error));
```

### Retry com exponential backoff

A falha em chamadas de API pode ocorrer por diversos motivos, e implementar uma estratégia de retry é crucial para garantir uma boa experiência ao usuário. O padrão de exponential backoff é uma abordagem eficiente, onde o tempo entre as tentativas aumenta exponencialmente.

Um exemplo de implementação pode ser visto abaixo:

```javascript
const fetchWithRetry = async (url, options = {}, retries = 3, backoff = 300) => {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
};

// Uso da função com retry
fetchWithRetry('https://api.example.com/data')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Failed after retries:', error));
```

### Abort e timeout

Uma das grandes limitações do Fetch API original era a falta de um método embutido para abortar requisições. Contudo, a introdução do `AbortController` em JavaScript trouxe uma solução elegante para esse problema.

Abaixo, um exemplo de como implementar abort e timeout:

```javascript
const fetchWithTimeout = (url, options = {}, timeout = 5000) => {
  const controller = new AbortController();
  const signal = controller.signal;

  const fetchPromise = fetch(url, { ...options, signal });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      controller.abort();
      reject(new Error('Request timed out'));
    }, timeout);
  });

  return Promise.race([fetchPromise, timeoutPromise]);
};

// Uso da função com timeout
fetchWithTimeout('https://api.example.com/data')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Fetch error:', error));
```

### SWR e React Query

Quando se fala em gerenciar estados de dados em aplicações React, bibliotecas como SWR e React Query se destacam. Ambas oferecem soluções para cache, revalidação e sincronização de dados, facilitando a implementação de chamadas de API de maneira eficiente e otimizada.

O SWR, desenvolvido pela equipe do Vercel, é uma biblioteca que se baseia na estratégia de stale-while-revalidate. Isso significa que, quando você faz uma requisição, o dado já em cache é retornado imediatamente, enquanto uma nova requisição é feita em segundo plano para atualizar os dados.

Aqui está um exemplo simples de uso do SWR:

```javascript
import useSWR from 'swr';

const fetcher = url => fetch(url).then(res => res.json());

function App() {
  const { data, error } = useSWR('https://api.example.com/data', fetcher);

  if (error) return <div>Error loading data</div>;
  if (!data) return <div>Loading...</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

### Comparação

A escolha entre Fetch API, Axios e bibliotecas como SWR ou React Query vai depender das necessidades específicas do seu projeto. O Fetch API é uma solução leve e eficiente para requisições básicas, enquanto o Axios oferece recursos adicionais como interceptores e cancelamento de requisições.

Já o SWR e o React Query são mais adequados para aplicações que requerem um gerenciamento mais robusto de estado e sincronização de dados.

- **Fetch API**: Nativo, leve e moderno. Ideal para requisições simples.
- **Axios**: Biblioteca robusta com suporte a interceptores e cancelamento.
- **SWR/React Query**: Focadas em gerenciamento de dados e estado, cache e revalidação.

### Conclusão

O cenário de requisições HTTP em JavaScript evoluiu bastante, e hoje temos uma variedade de ferramentas e abordagens à disposição. O Fetch API se consolidou como uma alternativa viável ao Axios, especialmente para desenvolvedores que buscam minimizar dependências externas. Ao mesmo tempo, bibliotecas como SWR e React Query expandem as opções, oferecendo soluções mais avançadas para gerenciamento de dados.

**Takeaways Práticos:**
- O Fetch API é uma opção leve e eficiente para requisições HTTP.
- Interceptores podem ser simulados com funções que envolvem o Fetch.
- Implementar retry com exponential backoff pode melhorar a robustez das requisições.
- O AbortController permite abortar requisições, resolvendo uma limitação do Fetch API.
- SWR e React Query são excelentes para gerenciamento avançado de estado e dados em aplicações React.

## Fontes
- [MDN Web Docs: Fetch API](https://developer.mozilla.org/pt-BR/docs/Web/API/Fetch_API)
- [Axios GitHub Repository](https://github.com/axios/axios)
- [SWR Documentation](https://swr.vercel.app/)
- [React Query Documentation](https://react-query.tanstack.com/)
- [JavaScript Info: Fetch](https://javascript.info/fetch)
