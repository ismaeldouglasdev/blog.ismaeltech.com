---
title: "Vitest: How to Test React with Truly Helpful Tests"
date: "2026-09-23"
category: "tutorial"
tags: ["vitest", "testes", "react", "tdd"]
excerpt: "Vitest: how to test React with tests that genuinely assist."
share_hook: "Vite setup, mocking, integration tests and CI coverage."
cover:
  image: "/covers/2026-09-23-vitest-como-testar-react-com-testes-que-realmente-ajudam.jpg"
comments: true
translationKey: "2026-09-23-vitest-como-testar-react-com-testes-que-realmente-ajudam"
---

## Vitest: how to test React with tests that truly help

Tests are not optional. They are essential for ensuring software quality and confidence in the functionalities we are implementing. Especially in React applications, where user interactions and dynamic behavior are constant. Here, I will share how to set up and use Vitest to efficiently test your React applications, ensuring that your tests genuinely help improve the quality of your code.


<figure>
<img src="/covers/2026-09-23-vitest-como-testar-react-com-testes-que-realmente-ajudam.jpg" alt="Vitest: How to Test React with Truly Helpful Tests" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>

```markdown
## Setup with Vite

To get started, we need to set up our environment. Vitest integrates seamlessly with Vite, which is a modern project build tool. To begin, create a new project using Vite if you don't have one yet:

```bash
npm create vite@latest my-project --template react
cd my-project
npm install
```

Now, let's add Vitest:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Next, we need to configure Vitest. Create a file `vite.config.js` at the root of the project with the following basic configuration:

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

With this, we already have Vitest ready for testing. Now, create a folder `src/__tests__` where we will store our test files.
```

```markdown
## Unit tests with React Testing Library

The React Testing Library is an excellent tool for testing React components, as it focuses on how users interact with the interface. Let's start by writing a simple test for a component.

Suppose we have a component `Button.js`:

```javascript
import React from 'react';

const Button = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};

export default Button;
```

Now, let's create a test for it. Create a file named `Button.test.js` inside the `__tests__` folder:

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../Button';

test('renders button with correct label', () => {
  render(<Button label="Click here" onClick={() => {}} />);
  const buttonElement = screen.getByText(/click here/i);
  expect(buttonElement).toBeInTheDocument();
});


test('calls onClick when clicked', () => {
  const handleClick = jest.fn();
  render(<Button label="Click here" onClick={handleClick} />);
  const buttonElement = screen.getByText(/click here/i);
  fireEvent.click(buttonElement);
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

These are examples of how we can verify that the button is being rendered correctly and that the `onClick` function is called when we click on it.
```

```markdown
## Mocking and Spies

Mocking is an essential technique for isolating parts of your code during testing. Vitest has built-in support for mocks. Let's see how we can mock a function.

Suppose we have a file `api.js` that makes an API call:

```javascript
export const fetchData = async () => {
  const response = await fetch('https://api.example.com/data');
  return response.json();
};
```

We can mock this function in our test:

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


<figure>
<img src="/media/2026-09-23-vitest-como-testar-react-com-testes-que-realmente-ajudam-1.jpg" alt="Vitest: How to Test React with Truly Helpful Tests" loading="lazy">
<figcaption>Sequential Software Testing Life Cycle. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3ASoftware_Testing_Life_Cycle.jpg">Software Testing Life Cycle.jpg</a> por Perfect Happiness — <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> · via Wikimedia Commons</figcaption>
</figure>
  const data = await fetchData();
  expect(data).toEqual(mockData);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
```

Here, we are using `vi.fn()` from Vitest to create a mock of the `fetch` function, allowing us to test `fetchData` without making a real API call.
```

```markdown
## Integration Tests

Integration tests verify how different parts of the system work together. Let's create a simple example where a component fetches data from an API and displays it.

Suppose we have a component `DataDisplay.js`:

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

  if (!data) return <div>Loading...</div>;

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

Now, let's test this component:

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
  
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  
  const itemElements = await screen.findAllByText(/item/i);
  expect(itemElements).toHaveLength(2);
});
```

In this test, we are mocking the `fetchData` function again and checking if the component displays the loading state before rendering the items.
```

```markdown
## Coverage and CI

Test coverage is crucial for understanding which parts of your code are being tested. Vitest provides support for easily generating coverage reports. To enable coverage, you can add the following configuration to your `vite.config.js`:

```javascript
test: {
  coverage: {
    reporter: ['text', 'json', 'html'],
  },
},
```

Now, when you run the tests, you will see a detailed coverage report. For continuous integration, you can use tools like GitHub Actions or GitLab CI to ensure that your tests are run on every pull request, validating the quality of the code before it is merged.
```

```markdown
## TDD in Practice

Test-Driven Development (TDD) is a powerful approach that can enhance the quality of your code. Start by writing a failing test, then write the code that makes the test pass, and finally refactor the code. This approach ensures that you are always building testable functionalities.

For example, when creating a new component, begin by writing a test that describes the expected behavior. Then implement the component until the test passes. This practice not only improves code quality but also serves as living documentation of your system's behavior.
```

```markdown
## Conclusion

Testing is a vital part of software development, and with tools like Vitest and React Testing Library, you can write effective tests that truly help ensure the quality of your code. By integrating tests into your workflow, you not only improve the stability of your application but also gain confidence in your implementations.

**Practical takeaways:**
- Use Vitest alongside Vite for a quick testing setup.
- Write unit tests with the React Testing Library to ensure your components work as expected.
- Utilize mocking to isolate functions and avoid unnecessary calls in tests.
- Conduct integration tests to verify the interaction between different parts of your system.
- Evaluate test coverage to identify areas that need more attention.
```

## Sources
- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Official Vite Documentation](https://vitejs.dev/guide/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)