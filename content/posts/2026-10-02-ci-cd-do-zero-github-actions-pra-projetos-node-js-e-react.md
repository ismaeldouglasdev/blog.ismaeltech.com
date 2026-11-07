---
title: "CI/CD do zero: GitHub Actions pra projetos Node.js e React"
date: "2026-10-02"
category: "tutorial"
tags: ["ci-cd", "github-actions", "devops"]
excerpt: "CI/CD do zero: GitHub Actions para projetos Node.js e React."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-10-02-ci-cd-do-zero-github-actions-pra-projetos-node-js-e-react.jpg"
comments: true
translationKey: "2026-10-02-ci-cd-do-zero-github-actions-pra-projetos-node-js-e-react"
---

## CI/CD do zero: GitHub Actions para projetos Node.js e React

Automatizar o processo de integração e entrega contínua (CI/CD) é uma prática essencial no desenvolvimento moderno de software. No entanto, para muitos, a configuração inicial de um pipeline pode parecer uma tarefa complicada. O que se pode fazer para simplificar essa jornada? Aqui, vou mostrar como configurar um workflow básico no GitHub Actions para projetos Node.js e React, garantindo que suas aplicações estejam sempre prontas para serem entregues de forma eficiente e confiável.

## Workflow básico

O primeiro passo para implementar CI/CD com GitHub Actions é criar um arquivo de workflow. Este arquivo, geralmente localizado na pasta `.github/workflows`, define as etapas que o GitHub deve seguir a cada push ou pull request.

Vamos criar um exemplo básico para um projeto Node.js. Aqui está um exemplo de um arquivo de workflow chamado `ci.yml`:

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v2

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '14'

    - name: Install dependencies
      run: npm install

    - name: Run tests
      run: npm test
```

Neste exemplo, o workflow é acionado em qualquer push ou pull request para o branch `main`. O job `build` é executado em um ambiente Ubuntu, onde as etapas incluem fazer checkout do código, configurar a versão do Node.js, instalar as dependências do projeto e executar os testes. 

## Matriz de versões

Um recurso poderoso do GitHub Actions é a capacidade de criar matrizes de versões. Isso permite que você teste seu código em múltiplas versões do Node.js simultaneamente. Aqui está como você pode modificar o workflow para incluir uma matriz:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [12, 14, 16]

    steps:
    - name: Checkout code
      uses: actions/checkout@v2

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: ${{ matrix.node-version }}

    - name: Install dependencies
      run: npm install

    - name: Run tests
      run: npm test
```

Com essa configuração, o GitHub Actions irá executar os testes para cada versão especificada na matriz. Isso é crucial para garantir que seu aplicativo funcione corretamente em diferentes ambientes.

## Cache de dependências

Um dos aspectos que pode melhorar significativamente a eficiência do seu pipeline é o cache de dependências. Ao armazenar em cache as dependências instaladas, você pode reduzir o tempo de execução do seu workflow. Aqui está um exemplo de como implementar isso:

```yaml
    steps:
    - name: Checkout code
      uses: actions/checkout@v2

    - name: Cache Node.js modules
      uses: actions/cache@v2
      with:
        path: ~/.npm
        key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
        restore-keys: |
          ${{ runner.os }}-node-

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: ${{ matrix.node-version }}

    - name: Install dependencies
      run: npm install
```

Nesta configuração, utilizamos a ação `actions/cache` para armazenar o diretório `~/.npm`, que contém as dependências instaladas. O cache é identificado por uma chave gerada com base no hash do arquivo `package-lock.json`, garantindo que, sempre que houver uma alteração nas dependências, o cache será invalidado e atualizado.

## Testes + lint

Garantir a qualidade do código é fundamental. Integrar testes automatizados e linting no seu pipeline CI/CD ajuda a manter os padrões de qualidade. Vamos adicionar essas etapas ao nosso workflow:

```yaml
    - name: Run lint
      run: npm run lint

    - name: Run tests
      run: npm test
```

Certifique-se de que você tenha scripts correspondentes no seu `package.json`. Por exemplo:

```json
{
  "scripts": {
    "lint": "eslint .",
    "test": "jest"
  }
}
```

Com isso, cada vez que o workflow for executado, seu código será verificado quanto a problemas de estilo e os testes automatizados serão realizados.

## Deploy automático

Depois que seu código passa em todos os testes, é hora de fazer o deploy. Podemos adicionar uma etapa de deploy ao nosso workflow. Neste exemplo, vamos usar o GitHub Pages como destino de deploy. Abaixo está como você pode configurar isso:

```yaml
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./build
```

Neste passo, a ação `peaceiris/actions-gh-pages` é usada para fazer o deploy do conteúdo da pasta `./build` (supondo que você tenha configurado seu projeto para gerar os arquivos de build nesta pasta) para o GitHub Pages.

## Secrets e variáveis

Ao trabalhar com CI/CD, é comum precisar lidar com informações sensíveis, como credenciais e tokens. O GitHub oferece a funcionalidade de Secrets para armazenar essas informações de forma segura. Você pode configurar secrets no repositório através das configurações do GitHub.

Para usar um secret no seu workflow, basta referenciá-lo usando a sintaxe `${{ secrets.NOME_DO_SECRET }}`. Por exemplo, se você tiver um secret chamado `API_TOKEN`, você pode usá-lo assim:

```yaml
    - name: Deploy to API
      run: curl -X POST -H "Authorization: Bearer ${{ secrets.API_TOKEN }}" https://api.example.com/deploy
```

Isso assegura que suas credenciais não fiquem expostas no código.

## Conclusão

Implementar um pipeline de CI/CD com GitHub Actions para projetos Node.js e React pode parecer desafiador à primeira vista, mas seguindo os passos corretos, torna-se uma tarefa simples e eficiente. Com a configuração adequada, você garante que seu código esteja sempre pronto para ser entregue, testado e verificado, aumentando a qualidade e a confiança no seu trabalho.

### Takeaways práticos:
- Crie workflows no GitHub Actions para automatizar testes e deployments.
- Utilize matrizes de versões para assegurar compatibilidade com múltiplas versões do Node.js.
- Implemente cache de dependências para otimizar o tempo de build.
- Integre testes e linting para garantir a qualidade do código.
- Utilize secrets para gerenciar informações sensíveis de forma segura.

## Fontes
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Node.js Official Documentation](https://nodejs.org/en/docs/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [ESLint Documentation](https://eslint.org/docs/user-guide/getting-started)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Actions Cache Documentation](https://github.com/actions/cache)