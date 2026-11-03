---
title: "CI/CD from Scratch: GitHub Actions for Node.js and React Projects"
date: "2026-10-02"
category: "tutorial"
tags: ["ci-cd", "github-actions", "devops"]
excerpt: "CI/CD from scratch: GitHub Actions for Node.js and React projects."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-10-02-ci-cd-do-zero-github-actions-pra-projetos-node-js-e-react.jpg"
lang: "en"
comments: true
translation_of: "2026-10-02-ci-cd-do-zero-github-actions-pra-projetos-node-js-e-react"
---

## CI/CD from scratch: GitHub Actions for Node.js and React projects

Automating the continuous integration and continuous delivery (CI/CD) process is an essential practice in modern software development. However, for many, the initial setup of a pipeline can seem like a complicated task. What can you do to simplify this journey? Here, I will show how to configure a basic workflow in GitHub Actions for Node.js and React projects, ensuring that your applications are always ready to be delivered efficiently and reliably.

## Basic Workflow

The first step to implementing CI/CD with GitHub Actions is to create a workflow file. This file, usually located in the `.github/workflows` folder, defines the steps GitHub should follow on each push or pull request.

Let's create a basic example for a Node.js project. Here is an example of a workflow file called `ci.yml`:

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

In this example, the workflow is triggered on any push or pull request to the `main` branch. The `build` job runs on an Ubuntu environment, where the steps include checking out the code, setting up the Node.js version, installing the project dependencies, and running the tests.

## Version Matrix

A powerful feature of GitHub Actions is the ability to create version matrices. This allows you to test your code across multiple versions of Node.js simultaneously. Here is how you can modify the workflow to include a matrix:

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

With this configuration, GitHub Actions will run the tests for each version specified in the matrix. This is crucial to ensure that your application works correctly across different environments.

## Dependency Cache

One aspect that can significantly improve your pipeline efficiency is dependency caching. By caching installed dependencies, you can reduce your workflow execution time. Here is an example of how to implement this:

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

In this configuration, we use the `actions/cache` action to store the `~/.npm` directory, which contains installed dependencies. The cache is identified by a key generated based on the hash of the `package-lock.json` file, ensuring that whenever there is a change in dependencies, the cache will be invalidated and updated.

## Tests + lint

Ensuring code quality is essential. Integrating automated tests and linting into your CI/CD pipeline helps maintain quality standards. Let's add these steps to our workflow:

```yaml
    - name: Run lint
      run: npm run lint

    - name: Run tests
      run: npm test
```

Make sure you have the corresponding scripts in your `package.json`. For example:

```json
{
  "scripts": {
    "lint": "eslint .",
    "test": "jest"
  }
}
```

This way, every time the workflow runs, your code will be checked for style issues and automated tests will be run.

## Automatic Deployment

After your code passes all tests, it is time to deploy. We can add a deployment step to our workflow. In this example, we will use GitHub Pages as the deployment target. Below is how you can configure this:

```yaml
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./build
```

In this step, the `peaceiris/actions-gh-pages` action is used to deploy the contents of the `./build` folder (assuming you have configured your project to generate build files in this folder) to GitHub Pages.

```markdown
## Secrets and Variables

When working with CI/CD, it is common to need to handle sensitive information, such as credentials and tokens. GitHub provides the Secrets functionality to store this information securely. You can configure secrets in the repository through the GitHub settings.

To use a secret in your workflow, simply reference it using the syntax `${{ secrets.NAME_OF_THE_SECRET }}`. For example, if you have a secret called `API_TOKEN`, you can use it like this:

```yaml
    - name: Deploy to API
      run: curl -X POST -H "Authorization: Bearer ${{ secrets.API_TOKEN }}" https://api.example.com/deploy
```

This ensures that your credentials are not exposed in the code.
```

## Conclusion

Implementing a CI/CD pipeline with GitHub Actions for Node.js and React projects may seem challenging at first glance, but by following the correct steps, it becomes a simple and efficient task. With the proper configuration, you ensure that your code is always ready to be delivered, tested, and verified, increasing the quality and confidence in your work.

### Practical Takeaways:

- Create workflows in GitHub Actions to automate tests and deployments.
- Use version matrices to ensure compatibility with multiple Node.js versions.
- Implement dependency caching to optimize build time.
- Integrate tests and linting to ensure code quality.
- Use secrets to manage sensitive information securely.

## Sources
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Node.js Official Documentation](https://nodejs.org/en/docs/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [ESLint Documentation](https://eslint.org/docs/user-guide/getting-started)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Actions Cache Documentation](https://github.com/actions/cache)