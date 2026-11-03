---
title: "Error handling em TypeScript: Result types e typed errors"
date: "2026-09-28"
category: "article"
tags: ["typescript", "error-handling", "arquitetura"]
excerpt: "Error handling em TypeScript: Result types e typed errors."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-09-28-error-handling-em-typescript-result-types-e-typed-errors.jpg"
lang: "pt"
---

## Error handling em TypeScript: Result types e typed errors

Lidar com erros em aplicações é uma tarefa desafiadora e muitas vezes negligenciada por desenvolvedores. Em vez de apenas lançar exceções, é fundamental considerar como os erros são tratados e propagados através do código. Isso se torna ainda mais importante em projetos grandes, onde a clareza e a robustez do tratamento de erros podem fazer a diferença entre uma aplicação estável e uma cheia de bugs. Aqui, vou mostrar como os tipos de resultados (`Result<T, E>`) e erros tipados podem melhorar a forma como lidamos com falhas em TypeScript.

## Throw vs Return

A abordagem tradicional para lidar com erros em JavaScript e TypeScript é o uso de `throw`. Lançar uma exceção interrompe a execução normal do código e transfere o controle para o primeiro bloco `catch` disponível. Embora isso funcione, pode se tornar problemático, especialmente em funções que exigem um fluxo de execução contínuo. Aqui está um exemplo simples:

```typescript
function dividir(a: number, b: number): number {
    if (b === 0) {
        throw new Error("Divisão por zero");
    }
    return a / b;
}

try {
    console.log(dividir(10, 0));
} catch (error) {
    console.error(error.message);
}
```

Nesse caso, se `b` for zero, o código lança uma exceção e interrompe a execução. Embora isso funcione, pode ocultar o resultado real da operação e complicar as sequências de chamadas.

Uma alternativa mais funcional é retornar um tipo que encapsula o resultado e o erro. Isso traz clareza ao fluxo de execução e permite que a função retorne um resultado válido ou um erro sem interromper a execução.

## Result<T, E> Pattern

O padrão `Result<T, E>` é uma maneira de encapsular resultados e erros em um único objeto. Ele permite que você trate erros como parte do fluxo normal do seu programa. Um exemplo básico de implementação desse padrão poderia ser:

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

function dividirComResultado(a: number, b: number): Result<number, string> {
    if (b === 0) {
        return { ok: false, error: "Divisão por zero" };
    }
    return { ok: true, value: a / b };
}

const resultado = dividirComResultado(10, 0);

if (resultado.ok) {
    console.log(`Resultado: ${resultado.value}`);
} else {
    console.error(`Erro: ${resultado.error}`);
}
```

Com essa abordagem, a função `dividirComResultado` retorna um objeto que indica se a operação foi bem-sucedida ou não. Isso torna o tratamento de erros mais explícito e facilita a manutenção do código.

## Neverthrow Lib

Uma biblioteca popular que implementa esse padrão é a `neverthrow`. Ela fornece uma estrutura robusta para trabalhar com tipos de resultado e erros de forma tipada. Aqui está um exemplo de como usá-la:

```typescript
import { err, ok, Result } from 'neverthrow';

function dividirComNeverthrow(a: number, b: number): Result<number, string> {
    if (b === 0) {
        return err("Divisão por zero");
    }
    return ok(a / b);
}

const resultado = dividirComNeverthrow(10, 0);

resultado.match({
    ok: (value) => console.log(`Resultado: ${value}`),
    err: (error) => console.error(`Erro: ${error}`),
});
```

A biblioteca `neverthrow` permite que você trate resultados e erros de forma mais fluida e expressiva. O método `match` é uma maneira elegante de lidar com os dois casos em um único lugar.

## Custom Error Classes

Embora o uso de tipos de resultado seja uma ótima maneira de lidar com erros, também é importante ter classes de erro personalizadas para situações específicas. Isso torna mais fácil identificar e tratar diferentes tipos de erros em seu código. Aqui está um exemplo de como criar uma classe de erro personalizada:

```typescript
class DivisaoPorZeroError extends Error {
    constructor() {
        super("Divisão por zero");
        this.name = "DivisaoPorZeroError";
    }
}

function dividirComErroPersonalizado(a: number, b: number): number {
    if (b === 0) {
        throw new DivisaoPorZeroError();
    }
    return a / b;
}

try {
    console.log(dividirComErroPersonalizado(10, 0));
} catch (error) {
    if (error instanceof DivisaoPorZeroError) {
        console.error(error.message);
    } else {
        console.error("Erro desconhecido");
    }
}
```

Com essa abordagem, você pode capturar e lidar com erros específicos, tornando seu código mais robusto e fácil de manter.

## Zod Error Formatting

Quando lidamos com validação de dados, como em APIs, é comum usar bibliotecas como o Zod para definir esquemas e validar objetos. O Zod também fornece uma maneira de formatar erros de validação de forma clara e estruturada. Veja um exemplo de como usar o Zod para validação e tratamento de erros:

```typescript
import { z } from 'zod';

const schema = z.object({
    nome: z.string().min(1),
    idade: z.number().min(0),
});

function validarUsuario(usuario: unknown) {
    try {
        schema.parse(usuario);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error(error.errors);
        } else {
            console.error("Erro desconhecido na validação");
        }
    }
}

validarUsuario({ nome: "", idade: -1 });
```

Neste caso, se o usuário não atender aos requisitos do esquema, o Zod lançará um `ZodError`, que pode ser tratado de forma específica.

## API Error Boundaries

Em aplicações que consomem APIs, é crucial ter um tratamento de erros bem definido. Ao fazer chamadas a APIs, muitas vezes você enfrentará erros de rede, respostas inesperadas ou erros de validação. Uma abordagem comum é criar limites de erro (error boundaries) que capturam esses erros e fornecem uma resposta apropriada.

Aqui está um exemplo de como implementar isso:

```typescript
async function chamarApi(url: string): Promise<Result<any, string>> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return err(`Erro na API: ${response.statusText}`);
        }
        const data = await response.json();
        return ok(data);
    } catch (error) {
        return err(`Erro de rede: ${error.message}`);
    }
}

chamarApi('https://api.exemplo.com/dados')
    .then(resultado => {
        resultado.match({
            ok: dados => console.log(`Dados recebidos: ${JSON.stringify(dados)}`),
            err: erro => console.error(`Erro: ${erro}`),
        });
    });
```

Com isso, você encapsula o tratamento de erros de API, permitindo que seu código lide com falhas de forma mais eficiente.

## Logging

Por fim, não podemos esquecer da importância do logging ao lidar com erros. É fundamental registrar informações sobre erros para que você possa diagnosticar problemas posteriormente. Um bom sistema de logging deve registrar detalhes sobre o erro, incluindo a pilha de chamadas, dados relevantes e o contexto em que ocorreu.

Aqui está um exemplo simples de como você poderia implementar um logging básico:

```typescript
function registrarErro(error: Error) {
    console.error(`Erro: ${error.message}`);
    // Aqui você poderia enviar o erro para um serviço de logging externo
}

try {
    dividirComErroPersonalizado(10, 0);
} catch (error) {
    registrarErro(error);
}
```

Com um logging eficaz, você pode melhorar a manutenção e a depuração do seu código, tornando mais fácil resolver problemas quando eles surgem.

## Conclusão

Tratar erros de forma eficiente é crucial para a criação de aplicações robustas e confiáveis. Ao adotar padrões como `Result<T, E>`, usar bibliotecas como `neverthrow`, criar classes de erro personalizadas e formatar erros com Zod, você pode melhorar significativamente a maneira como sua aplicação lida com falhas. Além disso, implementar limites de erro em APIs e um sistema de logging eficaz ajudará a aumentar a resiliência do seu código.

### Takeaways Práticos
- Utilize o padrão `Result<T, E>` para encapsular resultados e erros.
- Considere usar a biblioteca `neverthrow` para simplificar o tratamento de erros.
- Crie classes de erro personalizadas para lidar com situações específicas.
- Use o Zod para validação de dados e formatação de erros.
- Implemente limites de erro em chamadas a APIs e registre os erros para facilitar a depuração.

## Fontes
- [TypeScript Handbook: Error Handling](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#error-handling)
- [neverthrow Documentation](https://github.com/supermacro/neverthrow)
- [Zod Documentation](https://zod.dev/)
- [MDN Web Docs: try...catch](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Statements/try...catch)
- [LogRocket Blog: Error Handling in JavaScript](https://blog.logrocket.com/error-handling-in-javascript/)