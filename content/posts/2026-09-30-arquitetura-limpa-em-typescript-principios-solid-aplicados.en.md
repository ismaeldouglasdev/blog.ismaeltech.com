---
title: "Clean Architecture in TypeScript: Applying SOLID Principles"
date: "2026-09-30"
category: "article"
tags: ["typescript", "arquitetura", "solid"]
excerpt: "Clean Architecture in TypeScript: SOLID Principles Applied."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-09-30-arquitetura-limpa-em-typescript-principios-solid-aplicados.jpg"
comments: true
translationKey: "2026-09-30-arquitetura-limpa-em-typescript-principios-solid-aplicados"
---

## Clean Architecture in TypeScript: SOLID Principles Applied

Software architecture is a crucial aspect of development, and applying the SOLID principles is an excellent way to ensure that your code is flexible, maintainable, and scalable. What many don't realize is that architecture is not just about organizing code; it is a mindset that can transform the way you approach complex problems. Here, we will explore how the SOLID principles can be applied in TypeScript, using practical examples that illustrate each concept.

## SRP with services

The first SOLID principle is the Single Responsibility Principle (SRP). This principle states that a class should have only one reason to change. In practical terms, this means that each module or class should focus on a single task or responsibility.

When building services in TypeScript, we can apply SRP by creating classes that encapsulate the logic of a single domain. For example, consider a user service that manages operations related to users:

```typescript
class UserService {
    private users: User[];

    constructor() {
        this.users = [];
    }

    addUser(user: User): void {
        this.users.push(user);
    }

    getUserById(id: string): User | undefined {
        return this.users.find(user => user.id === id);
    }
}
```

In this example, the `UserService` class has the single responsibility of managing users. If, in the future, we want to add features like authentication or authorization, we could create separate services for those responsibilities, keeping the code clean and organized.

```markdown
## Open/Closed with Strategy Pattern

The Open/Closed Principle (OCP) states that classes should be open for extension but closed for modification. This means that you should be able to add new functionalities without altering the existing code.

One way to apply OCP in TypeScript is by using the strategy pattern. Imagine that we have a payment system that can support different payment methods. We can create a payment interface and then implement different payment strategies:

```typescript
interface PaymentStrategy {
    pay(amount: number): void;
}

class CreditCardPayment implements PaymentStrategy {
    pay(amount: number): void {
        console.log(`Paying ${amount} with credit card.`);
    }
}

class PayPalPayment implements PaymentStrategy {
    pay(amount: number): void {
        console.log(`Paying ${amount} with PayPal.`);
    }
}

class PaymentContext {
    private strategy: PaymentStrategy;

    constructor(strategy: PaymentStrategy) {
        this.strategy = strategy;
    }

    setStrategy(strategy: PaymentStrategy): void {
        this.strategy = strategy;
    }

    executePayment(amount: number): void {
        this.strategy.pay(amount);
    }
}
```

With this structure, we can easily add new payment methods without modifying the existing code. Just implement the `PaymentStrategy` interface and provide the new strategy to the `PaymentContext`.
```

## Liskov with Generics

The Liskov Substitution Principle (LSP) suggests that objects of a base class should be replaceable with objects of derived classes without altering the behavior of the program. An effective way to achieve this in TypeScript is by using generics.

Consider the following implementation of a generic class:

```typescript
class Repository<T> {
    private items: T[] = [];

    add(item: T): void {
        this.items.push(item);
    }

    getAll(): T[] {
        return this.items;
    }
}

class User {
    constructor(public id: string, public name: string) {}
}

const userRepo = new Repository<User>();
userRepo.add(new User('1', 'Ismael'));
```

Here, the `Repository` class is generic and can be used for any type of item, ensuring that the LSP is respected. This allows for greater flexibility and code reuse, as we can create specific repositories for different entities without duplicating code.

```markdown
## ISP with Interfaces

The Interface Segregation Principle (ISP) states that no class should be forced to depend on methods it does not use. This means that it is better to have several small, specific interfaces than a single large, comprehensive one.

In TypeScript, we can divide interfaces so that each one contains only the methods relevant to a particular context:

```typescript
interface Printable {
    print(): void;
}

interface Scannable {
    scan(): void;
}

class Printer implements Printable {
    print(): void {
        console.log('Printing document...');
    }
}

class Scanner implements Scannable {
    scan(): void {
        console.log('Scanning document...');
    }
}
```

In this example, the `Printable` and `Scannable` interfaces are small and focused, allowing the classes to implement only the methods they actually need. This keeps the code clean and easy to understand.
```

## DIP with Dependency Inversion

The Dependency Inversion Principle (DIP) states that high-level modules should not depend on low-level modules, but both should depend on abstractions. In TypeScript, this can be achieved by using interfaces to define contracts between different parts of the system.

Let's look at a practical example:

```typescript
interface MessageService {
    sendMessage(message: string): void;
}

class EmailService implements MessageService {
    sendMessage(message: string): void {
        console.log(`Sending message via email: ${message}`);
    }
}

class Notification {
    constructor(private messageService: MessageService) {}

    notify(message: string): void {
        this.messageService.sendMessage(message);
    }
}

const emailService = new EmailService();
const notification = new Notification(emailService);
notification.notify('Hello, Ismael!');
```

In this case, the `Notification` class depends on the abstraction `MessageService`, and not on a specific implementation. This makes the code more flexible and easier to test, as we can replace the message service implementation with another one (like SMS or Push) without changing the notification logic.

```markdown
## Complete Example

Letâs now bring together everything weâve learned in a complete example that demonstrates a simple application using all the SOLID principles. Imagine that we are building a system to manage a product catalog and that we need to apply the principles discussed.

```typescript
// Interfaces
interface Product {
    id: string;
    name: string;
}

interface ProductService {
    addProduct(product: Product): void;
    getProductById(id: string): Product | undefined;
}

// Implementation of ProductService
class ProductServiceImpl implements ProductService {
    private products: Product[] = [];

    addProduct(product: Product): void {
        this.products.push(product);
    }

    getProductById(id: string): Product | undefined {
        return this.products.find(product => product.id === id);
    }
}

// Strategy pattern for price calculation
interface PricingStrategy {
    calculatePrice(basePrice: number): number;
}

class DiscountPricing implements PricingStrategy {
    constructor(private discount: number) {}

    calculatePrice(basePrice: number): number {
        return basePrice - (basePrice * this.discount);
    }
}

// Pricing context
class PricingContext {
    private strategy: PricingStrategy;

    constructor(strategy: PricingStrategy) {
        this.strategy = strategy;
    }

    setStrategy(strategy: PricingStrategy): void {
        this.strategy = strategy;
    }

    executePricing(basePrice: number): number {
        return this.strategy.calculatePrice(basePrice);
    }
}

// Usage
const productService = new ProductServiceImpl();
productService.addProduct({ id: '1', name: 'Product A' });

const pricingContext = new PricingContext(new DiscountPricing(0.1));
const finalPrice = pricingContext.executePricing(100);
console.log(`Final price: $ ${finalPrice}`);
```

In this example, we have a product management system that applies the SOLID principles. The separation of responsibilities is clear, and the structure allows for future extensions without major changes to the code.
```

```markdown
## Conclusion

Adopting the SOLID principles in building applications in TypeScript not only improves code quality but also facilitates maintenance and scalability of the software. Here are some key points you can take to your next project:

- **Single Responsibility**: Keep your classes focused on a single task.
- **Open for Extension, Closed for Modification**: Use design patterns as a strategy to allow the addition of new functionalities.
- **Liskov Substitution**: Use generics to ensure that your derived classes can replace their base classes without issues.
- **Interface Segregation**: Avoid large interfaces; prefer smaller and more specific interfaces.
- **Dependency Inversion**: Depend on abstractions, not on concrete implementations, to increase the flexibility and testability of your code.

With these principles in mind, you will be better prepared to build systems that are not only functional but also robust and easy to maintain.
```

```markdown
## Sources

- [Official TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Design Patterns: Elements of Reusable Object-Oriented Software](https://www.pearson.com/us/higher-education/program/GoF-Design-Patterns-Elements-of-Reusable-Object-Oriented-Software-Addison-Wesley-Longman-1994/PGM282093.html)
- [FreeCodeCamp: Understanding SOLID Principles](https://www.freecodecamp.org/news/understanding-solid-principles-with-examples-in-javascript/)
- [Refactoring Guru: SOLID Principles](https://refactoring.guru/pt-br/solidity-principles)
```