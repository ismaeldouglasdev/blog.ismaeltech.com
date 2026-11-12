---
title: "Arquitetura limpa em TypeScript: princípios SOLID aplicados"
date: "2026-09-30"
category: "article"
tags: ["typescript", "arquitetura", "solid"]
excerpt: "Arquitetura limpa em TypeScript: princípios SOLID aplicados."
cover:
  image: "/covers/2026-09-30-arquitetura-limpa-em-typescript-principios-solid-aplicados.jpg"
comments: true
translationKey: "2026-09-30-arquitetura-limpa-em-typescript-principios-solid-aplicados"
---

## Arquitetura limpa em TypeScript: princípios SOLID aplicados

A arquitetura de software é um aspecto crucial no desenvolvimento, e aplicar os princípios SOLID é uma excelente maneira de garantir que o seu código seja flexível, manutenível e escalável. O que muitos não percebem é que a arquitetura não é apenas uma questão de organizar código; é uma mentalidade que pode transformar a maneira como você aborda problemas complexos. Aqui, exploraremos como os princípios SOLID podem ser aplicados em TypeScript, utilizando exemplos práticos que ilustram cada conceito.

## SRP com services

O primeiro princípio SOLID é o Princípio da Responsabilidade Única (Single Responsibility Principle - SRP). Esse princípio estabelece que uma classe deve ter apenas uma razão para mudar. Em termos práticos, isso significa que cada módulo ou classe deve estar focado em uma única tarefa ou responsabilidade.


<figure>
<img src="/media/2026-09-30-arquitetura-limpa-em-typescript-principios-solid-aplicados-1.jpg" alt="Arquitetura limpa em TypeScript: princípios SOLID aplicados" loading="lazy">
<figcaption>درخت مفاهیم معماری نرم افزار. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AASTA.ir_software_architecture_mind_map_printable.png">ASTA.ir software architecture mind map printable.png</a> por Mohammadjavadheydari — <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> · via Wikimedia Commons</figcaption>
</figure>

<figure>
<img src="/covers/2026-09-30-arquitetura-limpa-em-typescript-principios-solid-aplicados.jpg" alt="Arquitetura limpa em TypeScript: princípios SOLID aplicados" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>

Ao construir serviços em TypeScript, podemos aplicar o SRP criando classes que encapsulam a lógica de um único domínio. Por exemplo, considere um serviço de usuário que gerencia operações relacionadas a usuários:

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

Neste exemplo, a classe `UserService` tem a responsabilidade única de gerenciar usuários. Se, no futuro, quisermos adicionar funcionalidades como autenticação ou autorização, poderíamos criar serviços separados para essas responsabilidades, mantendo o código limpo e organizado.

## Open/Closed com strategy pattern

O princípio Open/Closed (OCP) afirma que as classes devem estar abertas para extensão, mas fechadas para modificação. Isso significa que você deve ser capaz de adicionar novas funcionalidades sem alterar o código existente.

Uma maneira de aplicar OCP em TypeScript é utilizando o padrão de estratégia. Imagine que temos um sistema de pagamento que pode suportar diferentes métodos de pagamento. Podemos criar uma interface de pagamento e, em seguida, implementar diferentes estratégias de pagamento:

```typescript
interface PaymentStrategy {
    pay(amount: number): void;
}

class CreditCardPayment implements PaymentStrategy {
    pay(amount: number): void {
        console.log(`Pagando ${amount} com cartão de crédito.`);
    }
}

class PayPalPayment implements PaymentStrategy {
    pay(amount: number): void {
        console.log(`Pagando ${amount} com PayPal.`);
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

Com essa estrutura, podemos facilmente adicionar novos métodos de pagamento sem modificar o código existente. Basta implementar a interface `PaymentStrategy` e fornecer a nova estratégia ao `PaymentContext`.

## Liskov com generics

O Princípio de Substituição de Liskov (LSP) sugere que objetos de uma classe base devem ser substituíveis por objetos de classes derivadas sem alterar o comportamento do programa. Um jeito eficaz de fazer isso em TypeScript é utilizando generics.


Considere a seguinte implementação de uma classe genérica:

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

Aqui, a classe `Repository` é genérica e pode ser usada para qualquer tipo de item, garantindo que o princípio LSP seja respeitado. Isso permite uma maior flexibilidade e reutilização de código, já que podemos criar repositórios específicos para diferentes entidades sem duplicação de código.

## ISP com interfaces

O Princípio da Segregação de Interfaces (ISP) afirma que nenhuma classe deve ser forçada a depender de métodos que não utiliza. Isso significa que é melhor ter várias interfaces pequenas e específicas do que uma única interface grande e abrangente.

Em TypeScript, podemos dividir interfaces de forma que cada uma delas contenha apenas os métodos relevantes para um determinado contexto:

```typescript
interface Printable {
    print(): void;
}

interface Scannable {
    scan(): void;
}

class Printer implements Printable {
    print(): void {
        console.log('Imprimindo documento...');
    }
}

class Scanner implements Scannable {
    scan(): void {
        console.log('Escaneando documento...');
    }
}
```

Nesse exemplo, as interfaces `Printable` e `Scannable` são pequenas e focadas, permitindo que as classes implementem apenas os métodos que realmente precisam. Isso mantém o código limpo e fácil de entender.

## DIP com inversão

O Princípio da Inversão de Dependência (DIP) estabelece que módulos de alto nível não devem depender de módulos de baixo nível, mas ambos devem depender de abstrações. Em TypeScript, isso pode ser alcançado utilizando interfaces para definir contratos entre diferentes partes do sistema.

Vamos ver um exemplo prático:

```typescript
interface MessageService {
    sendMessage(message: string): void;
}

class EmailService implements MessageService {
    sendMessage(message: string): void {
        console.log(`Enviando mensagem por email: ${message}`);
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
notification.notify('Olá, Ismael!');
```

Nesse caso, a classe `Notification` depende da abstração `MessageService`, e não de uma implementação específica. Isso torna o código mais flexível e fácil de testar, já que podemos substituir a implementação do serviço de mensagens por outra (como SMS ou Push) sem alterar a lógica de notificação.

## Exemplo completo

Vamos agora juntar tudo o que aprendemos em um exemplo completo que mostra uma aplicação simples utilizando todos os princípios SOLID. Imagine que estamos construindo um sistema para gerenciar um catálogo de produtos e que precisamos aplicar os princípios discutidos.

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

// Implementação do ProductService
class ProductServiceImpl implements ProductService {
    private products: Product[] = [];

    addProduct(product: Product): void {
        this.products.push(product);
    }

    getProductById(id: string): Product | undefined {
        return this.products.find(product => product.id === id);
    }
}

// Padrão de estratégia para cálculo de preço
interface PricingStrategy {
    calculatePrice(basePrice: number): number;
}

class DiscountPricing implements PricingStrategy {
    constructor(private discount: number) {}

    calculatePrice(basePrice: number): number {
        return basePrice - (basePrice * this.discount);
    }
}

// Contexto de preço
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

// Uso
const productService = new ProductServiceImpl();
productService.addProduct({ id: '1', name: 'Produto A' });

const pricingContext = new PricingContext(new DiscountPricing(0.1));
const finalPrice = pricingContext.executePricing(100);
console.log(`Preço final: R$ ${finalPrice}`);
```

Neste exemplo, temos um sistema de gerenciamento de produtos que aplica os princípios SOLID. A separação de responsabilidades é clara, e a estrutura permite futuras extensões sem grandes mudanças no código.

## Conclusão

Adotar os princípios SOLID na construção de aplicações em TypeScript não só melhora a qualidade do código, mas também facilita a manutenção e a escalabilidade do software. Aqui estão alguns pontos-chave que você pode levar para o seu próximo projeto:

- **Responsabilidade Única**: Mantenha suas classes focadas em uma única tarefa.
- **Aberto para Extensão, Fechado para Modificação**: Use padrões de design como estratégia para permitir a adição de novas funcionalidades.
- **Substituição de Liskov**: Utilize generics para garantir que suas classes derivadas possam substituir suas classes base sem problemas.
- **Segregação de Interfaces**: Evite interfaces grandes; prefira interfaces menores e específicas.
- **Inversão de Dependência**: Dependa de abstrações, não de implementações concretas, para aumentar a flexibilidade e a testabilidade do seu código.

Com esses princípios em mente, você estará melhor preparado para construir sistemas que são não apenas funcionais, mas também robustos e fáceis de manter.

## Fontes

- [Documentação oficial do TypeScript](https://www.typescriptlang.org/docs/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Design Patterns: Elements of Reusable Object-Oriented Software](https://www.pearson.com/us/higher-education/program/GoF-Design-Patterns-Elements-of-Reusable-Object-Oriented-Software-Addison-Wesley-Longman-1994/PGM282093.html)
- [FreeCodeCamp: Understanding SOLID Principles](https://www.freecodecamp.org/news/understanding-solid-principles-with-examples-in-javascript/)
- [Refactoring Guru: SOLID Principles](https://refactoring.guru/pt-br/solidity-principles)