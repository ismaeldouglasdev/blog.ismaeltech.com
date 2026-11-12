---
title: "Vitest: como testar React com testes que realmente ajudam"
date: "2026-09-23"
category: "tutorial"
tags: ["vitest", "testes", "react", "tdd"]
excerpt: "Vitest: como testar React com testes que realmente ajudam."
share_hook: "Setup, mocking, testes de integração e coverage no CI: o fluxo completo de testes com Vitest em React."
cover:
  image: "/covers/2026-09-23-vitest-como-testar-react-com-testes-que-realmente-ajudam.jpg"
comments: true
translationKey: "2026-09-23-vitest-como-testar-react-com-testes-que-realmente-ajudam"
---

Testes não são opcionais. Eles são essenciais para garantir a qualidade do software e a confiança nas funcionalidades que estamos implementando. Especialmente em aplicações React, onde as interações do usuário e o comportamento dinâmico são constantes. Aqui, vou compartilhar como configurar e utilizar o Vitest para testar suas aplicações React de maneira eficiente, garantindo que seus testes realmente ajudem a melhorar a qualidade do seu código.

## Setup com Vite

Para começar, precisamos configurar nosso ambiente. O Vitest se integra perfeitamente ao Vite, que é uma ferramenta moderna de construção de projetos. Para iniciar, crie um novo projeto usando Vite, caso ainda não tenha um:

```bash
npm create vite@latest meu-projeto --template react
cd meu-projeto
npm install
```

Agora, vamos adicionar o Vitest:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Em seguida, precisamos configurar o Vitest. Crie um arquivo `vite.config.js` na raiz do projeto com a seguinte configuração básica:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
```

Com isso, já temos o Vitest pronto para testes. Agora, crie uma pasta `src/__tests__` onde armazenaremos nossos arquivos de teste.

## Unit tests com React Testing Library

A React Testing Library é uma excelente ferramenta para testar componentes React, pois se concentra em como os usuários interagem com a interface. Vamos começar escrevendo um teste simples para um componente.


<figure>
<img src="/media/2026-09-23-vitest-como-testar-react-com-testes-que-realmente-ajudam-1.jpg" alt="Vitest: como testar React com testes que realmente ajudam" loading="lazy">
<figcaption>Sequential Software Testing Life Cycle. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3ASoftware_Testing_Life_Cycle.jpg">Software Testing Life Cycle.jpg</a> por Perfect Happiness — <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> · via Wikimedia Commons</figcaption>
</figure>

<figure>
<img src="/covers/2026-09-23-vitest-como-testar-react-com-testes-que-realmente-ajudam.jpg" alt="Vitest: como testar React com testes que realmente ajudam" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>

Suponha que temos um componente `Button.js`:

```javascript
import React from 'react';

const Button = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};

export default Button;
```

Agora, vamos criar um teste para ele. Crie um arquivo chamado `Button.test.js` dentro da pasta `__tests__`:

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../Button';

test('renders button with correct label', () => {
  render(<Button label="Clique aqui" onClick={() => {}} />);
  const buttonElement = screen.getByText(/clique aqui/i);
  expect(buttonElement).toBeInTheDocument();
});

test('calls onClick when clicked', () => {
  const handleClick = jest.fn();
  render(<Button label="Clique aqui" onClick={handleClick} />);
  const buttonElement = screen.getByText(/clique aqui/i);
  fireEvent.click(buttonElement);
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

Esses são exemplos de como podemos verificar se o botão está sendo renderizado corretamente e se a função `onClick` é chamada quando clicamos nele.

## Mocking e spies

O mocking é uma técnica essencial para isolar partes do seu código durante os testes. O Vitest possui suporte integrado para mocks. Vamos ver como podemos mockar uma função.

Suponha que temos um arquivo `api.js` que faz uma chamada de API:

```javascript
export const fetchData = async () => {
  const response = await fetch('https://api.exemplo.com/dados');
  return response.json();
};
```

Podemos mockar essa função em nosso teste:

```javascript
import { fetchData } from '../api';
import { vi } from 'vitest';

test('fetchData calls the API and returns data', async () => {
  const mockData = { items: ['item1', 'item2'] };
  global.fetch = vi.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve(mockData),
    })
  );

  const data = await fetchData();
  expect(data).toEqual(mockData);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
```

Aqui, estamos utilizando `vi.fn()` do Vitest para criar um mock da função `fetch`, permitindo que testemos `fetchData` sem fazer uma chamada real à API.

## Testes de integração

Os testes de integração verificam como diferentes partes do sistema funcionam juntas. Vamos criar um exemplo simples onde um componente busca dados de uma API e os exibe.


Suponha que temos um componente `DataDisplay.js`:

```javascript
import React, { useEffect, useState } from 'react';
import { fetchData } from './api';

const DataDisplay = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const getData = async () => {
      const result = await fetchData();
      setData(result);
    };
    getData();
  }, []);

  if (!data) return <div>Carregando...</div>;

  return (
    <div>
      {data.items.map((item, index) => (
        <div key={index}>{item}</div>
      ))}
    </div>
  );
};

export default DataDisplay;
```

Agora, vamos testar esse componente:

```javascript
import { render, screen } from '@testing-library/react';
import DataDisplay from '../DataDisplay';
import { fetchData } from '../api';
import { vi } from 'vitest';

vi.mock('../api');

test('renders loading state and fetches data', async () => {
  const mockData = { items: ['item1', 'item2'] };
  fetchData.mockResolvedValue(mockData);

  render(<DataDisplay />);
  
  expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  
  const itemElements = await screen.findAllByText(/item/i);
  expect(itemElements).toHaveLength(2);
});
```

Neste teste, estamos mockando a função `fetchData` novamente e verificando se o componente exibe o estado de carregamento antes de renderizar os itens.

## Coverage e CI

Cobertura de teste é crucial para entender quais partes do seu código estão sendo testadas. O Vitest fornece suporte para geração de relatórios de cobertura facilmente. Para ativar a cobertura, você pode adicionar a seguinte configuração no seu `vite.config.js`:

```javascript
test: {
  coverage: {
    reporter: ['text', 'json', 'html'],
  },
},
```

Agora, ao rodar os testes, você verá um relatório de cobertura detalhado. Para integração contínua, você pode usar ferramentas como GitHub Actions ou GitLab CI para garantir que seus testes sejam executados em cada pull request, validando a qualidade do código antes de ser mesclado.

## TDD na prática

O desenvolvimento orientado a testes (TDD) é uma abordagem poderosa que pode aumentar a qualidade do seu código. Comece escrevendo um teste que falha, em seguida escreva o código que faz o teste passar, e por fim refatore o código. Essa abordagem garante que você esteja sempre construindo funcionalidades testáveis.

Por exemplo, ao criar um novo componente, comece escrevendo um teste que descreva o comportamento esperado. Depois implemente o componente até que o teste passe. Essa prática não apenas melhora a qualidade do código, mas também serve como documentação viva do comportamento do seu sistema.

## Conclusão

Testes são uma parte vital do desenvolvimento de software e com ferramentas como Vitest e React Testing Library, você pode escrever testes eficazes que realmente ajudam a garantir a qualidade do seu código. Ao integrar testes em seu fluxo de trabalho, você não apenas melhora a estabilidade da sua aplicação, mas também ganha confiança em suas implementações.

**Takeaways práticos:**
- Use Vitest junto com Vite para uma configuração de testes rápida.
- Escreva testes unitários com a React Testing Library para garantir que seus componentes funcionem como esperado.
- Utilize mocking para isolar funções e evitar chamadas desnecessárias em testes.
- Realize testes de integração para verificar a interação entre diferentes partes do seu sistema.
- Avalie a cobertura de testes para identificar áreas que precisam de mais atenção.

## Fontes
- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Documentação oficial do Vite](https://vitejs.dev/guide/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)