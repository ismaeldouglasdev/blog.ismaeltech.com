---
title: "Clean Architecture in TypeScript: Applying SOLID Principles"
date: "2026-09-21"
category: "article"
tags: ["typescript", "arquitetura", "solid"]
excerpt: "Clean architecture in TypeScript: SOLID principles applied with services, the strategy pattern, generics, and dependency inversion."
share_hook: "SOLID one principle at a time: services, strategy, generics, DIP."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-09-21-arquitetura-limpa-em-typescript-principios-solid-aplicados.jpg"
comments: true
translationKey: "2026-09-21-arquitetura-limpa-em-typescript-principios-solid-aplicados"
---

## Introduction
When it comes to developing software, clean architecture is fundamental to ensuring that the code is easy to maintain, scale, and understand. However, many developers face challenges in implementing this approach in their projects. Recently, I had the opportunity to work on a project that required a clean and scalable architecture, and I realized that the SOLID principles are essential to achieving this goal. Here, I will show how to apply these principles in TypeScript to create a clean and effective architecture.

---
## SRP with services
The Single Responsibility Principle (SRP) is the first of the SOLID principles and states that a class should have only one reason to change. In other words, a class should have only one responsibility. To apply this principle in TypeScript, we can create services that encapsulate specific business logic. For example, in a project I recently developed, I created an authentication service that handled validating user credentials. This allowed the rest of the code to focus on other responsibilities, making it easier to maintain and understand.


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-21-arquitetura-limpa-em-typescript-principios-solid-aplicados-1.jpg" alt="Clean Architecture in TypeScript: Applying SOLID Principles" loading="lazy">
<figcaption>Soon Hyun to Syngman Rhee
Institution name: USC Korean Heritage Library; Processing funded by a grant from the Library Services and Technology Act (LSTA), Cali. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3ASoon_Hyun_to_Syngman_Rhee_%28KADA-shyun04-058%29.jpg">Soon Hyun to Syngman Rhee (KADA-shyun04-058).jpg</a> por Unknown authorUnknown author — <a href="https://creativecommons.org/licenses/">Public domain</a> · via Wikimedia Commons</figcaption>
</figure>

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-09-21-arquitetura-limpa-em-typescript-principios-solid-aplicados.jpg" alt="Clean Architecture in TypeScript: Applying SOLID Principles" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>

```typescript
// example of authentication service
interface AutenticacaoService {
  autenticar(usuario: string, senha: string): boolean;
}

class AutenticacaoServiceImpl implements AutenticacaoService {
  autenticar(usuario: string, senha: string): boolean {
    // authentication logic
    return true;
  }
}
```

---
## Open/Closed with strategy pattern
The Open/Closed principle states that a class should be open for extension, but closed for modification. This means that we should be able to add new functionality without modifying the existing code. In TypeScript, we can apply this principle using the strategy pattern. For example, in a project I developed, I created a class that was responsible for processing payments, but I wanted to allow different payment gateways to be used. To achieve this, I created an interface that defined the payment strategy and implemented different classes that implemented this interface.

```typescript
// example of payment strategy
interface PagamentoStrategy {
  processarPagamento(valor: number): void;
}

class PagamentoPayPal implements PagamentoStrategy {
  processarPagamento(valor: number): void {
    // PayPal payment logic
  }
}

class PagamentoStripe implements PagamentoStrategy {
  processarPagamento(valor: number): void {
    // Stripe payment logic
  }
}
```

---
## Liskov with Generics
The Liskov principle states that subclasses should be substitutable for their superclasses. In TypeScript, we can apply this principle using generics. For example, in a project I developed, I created a class responsible for processing data, but I wanted to allow different types of data to be processed. To achieve this, I created a generic class that could work with different types of data.


```typescript
// example of a generic class
class DataProcessor<T> {
  processData(data: T): void {
    // data processing logic
  }
}
```

---
## ISP with interfaces
The Interface Segregation Principle (ISP) states that interfaces should be segregated so that classes are not forced to implement methods they don't need. In TypeScript, we can apply this principle by creating interfaces that define only the necessary methods. For example, in a project I developed, I created an interface that defined the necessary methods for a class responsible for processing orders.

```typescript
// example of interface
interface PedidoProcessor {
  processarPedido(pedido: Pedido): void;
}
```

---
## DIP with Inversion
The Dependency Inversion Principle (DIP) states that high-level classes should not depend on low-level classes, but rather on abstractions. In TypeScript, we can apply this principle using dependency inversion. For example, in a project I developed, I created a class that was responsible for processing payments, but I wanted to allow different payment gateways to be used. To achieve this, I created an interface that defined the dependency and implemented different classes that implemented this interface.

```typescript
// example of dependency inversion
interface PagamentoGateway {
  processarPagamento(valor: number): void;
}

class PagamentoProcessor {
  private gateway: PagamentoGateway;

  constructor(gateway: PagamentoGateway) {
    this.gateway = gateway;
  }

  processarPagamento(valor: number): void {
    this.gateway.processarPagamento(valor);
  }
}
```

---
## Complete Example
Here is a complete example of how to apply the SOLID principles in TypeScript:

```typescript
// complete example
interface AuthenticationService {
  authenticate(user: string, password: string): boolean;
}

class AuthenticationServiceImpl implements AuthenticationService {
  authenticate(user: string, password: string): boolean {
    // authentication logic
    return true;
  }
}

interface PaymentStrategy {
  processPayment(amount: number): void;
}

class PayPalPayment implements PaymentStrategy {
  processPayment(amount: number): void {
    // PayPal payment logic
  }
}

class StripePayment implements PaymentStrategy {
  processPayment(amount: number): void {
    // Stripe payment logic
  }
}

class DataProcessor<T> {
  processData(data: T): void {
    // data processing logic
  }
}

interface OrderProcessor {
  processOrder(order: Order): void;
}

class OrderProcessorImpl implements OrderProcessor {
  processOrder(order: Order): void {
    // order processing logic
  }
}

interface PaymentGateway {
  processPayment(amount: number): void;
}

class PaymentProcessor {
  private gateway: PaymentGateway;

  constructor(gateway: PaymentGateway) {
    this.gateway = gateway;
  }

  processPayment(amount: number): void {
    this.gateway.processPayment(amount);
  }
}
```

---
## Conclusion
In summary, the SOLID principles are fundamental to creating a clean and scalable architecture in TypeScript. By applying these principles, we can create code that is easy to maintain, understand, and scale. Here are the main takeaways:
* SRP: each class should have only one responsibility
* Open/Closed: classes should be open to extension, but closed to modification
* Liskov: subclasses should be substitutable for their superclasses
* ISP: interfaces should be segregated so that classes are not forced to implement methods they do not need
* DIP: high-level classes should not depend on low-level classes, but rather on abstractions

---

## Sources
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/basic-types.html)
- [Design Patterns](https://en.wikipedia.org/wiki/Design_pattern_(computer_science))