---
title: "Error Handling in TypeScript: Result Types and Typed Errors"
date: "2026-09-28"
category: "article"
tags: ["typescript", "error-handling", "arquitetura"]
excerpt: "Error handling in TypeScript: Result types and typed errors."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-09-28-error-handling-em-typescript-result-types-e-typed-errors.jpg"
comments: true
translationKey: "2026-09-28-error-handling-em-typescript-result-types-e-typed-errors"
---

## Error handling in TypeScript: Result types and typed errors

Handling errors in applications is a challenging task and is often overlooked by developers. Instead of simply throwing exceptions, it is crucial to consider how errors are handled and propagated through the code. This becomes even more important in large projects, where clarity and robustness in error handling can make the difference between a stable application and one riddled with bugs. Here, I will show how result types (`Result<T, E>`) and typed errors can improve the way we handle failures in TypeScript.

## Throw vs Return

The traditional approach to error handling in JavaScript and TypeScript is using `throw`. Throwing an exception halts the normal execution of the code and transfers control to the first available `catch` block. While this works, it can become problematic, especially in functions that require a continuous execution flow. Here is a simple example:


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-28-error-handling-em-typescript-result-types-e-typed-errors-1.jpg" alt="Error Handling in TypeScript: Result Types and Typed Errors" loading="lazy">
<figcaption>visible à airbus Defense & Space Toulouse depuis le chemin du canal du midi. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3ABoite_de_transport_de_la_sonde_JUICE.jpg">Boite de transport de la sonde JUICE.jpg</a> por DuniterDotOrg — <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> · via Wikimedia Commons</figcaption>
</figure>

```typescript
function dividir(a: number, b: number): number {
    if (b === 0) {
        throw new Error("DivisÃ£o por zero");
    }
    return a / b;
}

try {
    console.log(dividir(10, 0));
} catch (error) {
    console.error(error.message);
}
```

In this case, if `b` is zero, the code throws an exception and halts execution. Although this works, it can obscure the actual result of the operation and complicate call sequences.

A more functional alternative is to return a type that encapsulates both the result and the error. This brings clarity to the execution flow and allows the function to return either a valid result or an error without interrupting execution.

```markdown
## Result<T, E> Pattern

The `Result<T, E>` pattern is a way to encapsulate results and errors in a single object. It allows you to handle errors as part of the normal flow of your program. A basic example of implementing this pattern could be:

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

function dividirComResultado(a: number, b: number): Result<number, string> {
    if (b === 0) {
        return { ok: false, error: "Division by zero" };
    }
    return { ok: true, value: a / b };
}

const resultado = dividirComResultado(10, 0);

if (resultado.ok) {
    console.log(`Result: ${resultado.value}`);
} else {
    console.error(`Error: ${resultado.error}`);
}
```

With this approach, the `dividirComResultado` function returns an object that indicates whether the operation was successful or not. This makes error handling more explicit and facilitates code maintenance.
```

## Neverthrow Lib

A popular library that implements this pattern is `neverthrow`. It provides a robust framework for working with result types and errors in a typed manner. Here is an example of how to use it:

```typescript
import { err, ok, Result } from 'neverthrow';

function dividirComNeverthrow(a: number, b: number): Result<number, string> {
    if (b === 0) {
        return err("Division by zero");
    }
    return ok(a / b);
}

const resultado = dividirComNeverthrow(10, 0);

resultado.match({
    ok: (value) => console.log(`Result: ${value}`),
    err: (error) => console.error(`Error: ${error}`),
});
```

The `neverthrow` library allows you to handle results and errors in a more fluid and expressive way. The `match` method is an elegant way to deal with both cases in a single place.

```markdown
## Custom Error Classes

Although using result types is a great way to handle errors, it is also important to have custom error classes for specific situations. This makes it easier to identify and handle different types of errors in your code. Here is an example of how to create a custom error class:

```typescript
class DivisaoPorZeroError extends Error {
    constructor() {
        super("Division by zero");
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
        console.error("Unknown error");
    }
}
```

With this approach, you can catch and handle specific errors, making your code more robust and easier to maintain.
```

## Zod Error Formatting

When dealing with data validation, such as in APIs, it is common to use libraries like Zod to define schemas and validate objects. Zod also provides a way to format validation errors clearly and structurally. Here is an example of how to use Zod for validation and error handling:


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-28-error-handling-em-typescript-result-types-e-typed-errors-2.jpg" alt="Error Handling in TypeScript: Result Types and Typed Errors" loading="lazy">
<figcaption>Fred A. Dolph to Korean Provisional Government
Institution name: USC Korean Heritage Library; Processing funded by a grant from the Library Services and Techno. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AFred_A._Dolph_to_Korean_Provisional_Government_%28KADA-shyun04-010%29.jpg">Fred A. Dolph to Korean Provisional Government (KADA-shyun04-010).jpg</a> por Unknown authorUnknown author — <a href="https://creativecommons.org/licenses/">Public domain</a> · via Wikimedia Commons</figcaption>
</figure>

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
            console.error("Unknown error in validation");
        }
    }
}

validarUsuario({ nome: "", idade: -1 });
```

In this case, if the user does not meet the schema requirements, Zod will throw a `ZodError`, which can be handled specifically.

```markdown
## API Error Boundaries

In applications that consume APIs, it is crucial to have a well-defined error handling strategy. When making API calls, you will often encounter network errors, unexpected responses, or validation errors. A common approach is to create error boundaries that capture these errors and provide an appropriate response.

Here is an example of how to implement this:

```typescript
async function callApi(url: string): Promise<Result<any, string>> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return err(`API Error: ${response.statusText}`);
        }
        const data = await response.json();
        return ok(data);
    } catch (error) {
        return err(`Network Error: ${error.message}`);
    }
}

callApi('https://api.example.com/data')
    .then(result => {
        result.match({
            ok: data => console.log(`Data received: ${JSON.stringify(data)}`),
            err: error => console.error(`Error: ${error}`),
        });
    });
```

With this, you encapsulate the API error handling, allowing your code to manage failures more efficiently.
```

## Logging

Finally, we cannot forget the importance of logging when dealing with errors. It is essential to record information about errors so that you can diagnose problems later. A good logging system should capture details about the error, including the call stack, relevant data, and the context in which it occurred.

Here is a simple example of how you could implement basic logging:

```typescript
function logError(error: Error) {
    console.error(`Error: ${error.message}`);
    // Here you could send the error to an external logging service
}

try {
    divideWithCustomError(10, 0);
} catch (error) {
    logError(error);
}
```

With effective logging, you can improve the maintenance and debugging of your code, making it easier to resolve issues when they arise.

```markdown
## Conclusion

Handling errors efficiently is crucial for the creation of robust and reliable applications. By adopting patterns like `Result<T, E>`, using libraries such as `neverthrow`, creating custom error classes, and formatting errors with Zod, you can significantly improve the way your application deals with failures. Furthermore, implementing error limits in APIs and an effective logging system will help enhance the resilience of your code.

### Practical Takeaways
- Use the `Result<T, E>` pattern to encapsulate results and errors.
- Consider using the `neverthrow` library to simplify error handling.
- Create custom error classes to handle specific situations.
- Use Zod for data validation and error formatting.
- Implement error limits in API calls and log errors to facilitate debugging.
```

## Sources
- [TypeScript Handbook: Error Handling](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#error-handling)
- [neverthrow Documentation](https://github.com/supermacro/neverthrow)
- [Zod Documentation](https://zod.dev/)
- [MDN Web Docs: try...catch](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Statements/try...catch)
- [LogRocket Blog: Error Handling in JavaScript](https://blog.logrocket.com/error-handling-in-javascript/)