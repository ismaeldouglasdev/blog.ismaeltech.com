---
title: "Arquitetura limpa em TypeScript: princípios SOLID aplicados"
date: "2026-09-21"
category: "article"
tags: ["typescript", "arquitetura", "solid"]
excerpt: "Arquitetura limpa em TypeScript: princípios SOLID aplicados com services, strategy pattern, generics e inversão de dependência."
share_hook: "SOLID na prática, um princípio por vez: services, strategy pattern, generics e inversão de dependência, cada um com código de exemplo."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-09-21-arquitetura-limpa-em-typescript-principios-solid-aplicados.jpg"
comments: true
translationKey: "2026-09-21-arquitetura-limpa-em-typescript-principios-solid-aplicados"
---

## Introdução
Quando se trata de desenvolver software, a arquitetura limpa é fundamental para garantir que o código seja fácil de manter, escalar e entender. No entanto, muitos desenvolvedores enfrentam desafios para implementar essa abordagem em seus projetos. Recentemente, tive a oportunidade de trabalhar em um projeto que exigia uma arquitetura limpa e escalável, e percebi que os princípios SOLID são essenciais para alcançar esse objetivo. aqui, vou mostrar como aplicar esses princípios em TypeScript para criar uma arquitetura limpa e eficaz.

## SRP com services
O princípio da Responsabilidade Única (SRP) é o primeiro dos princípios SOLID e afirma que uma classe deve ter apenas uma razão para mudar. Em outras palavras, uma classe deve ter apenas uma responsabilidade. Para aplicar esse princípio em TypeScript, podemos criar serviços que encapsulam uma lógica de negócios específica. Por exemplo, em um projeto que eu desenvolvi recentemente, criei um serviço de autenticação que se encarregava de validar as credenciais dos usuários. Isso permitiu que o resto do código se concentrasse em outras responsabilidades, tornando-o mais fácil de manter e entender.

```typescript
// exemplo de serviço de autenticação
interface AutenticacaoService {
  autenticar(usuario: string, senha: string): boolean;
}

class AutenticacaoServiceImpl implements AutenticacaoService {
  autenticar(usuario: string, senha: string): boolean {
    // lógica de autenticação
    return true;
  }
}
```

## Open/Closed com strategy pattern
O princípio Aberto-Fechado (Open/Closed) afirma que uma classe deve ser aberta para extensão, mas fechada para modificação. Isso significa que devemos ser capazes de adicionar novas funcionalidades sem modificar o código existente. Em TypeScript, podemos aplicar esse princípio usando o padrão de estratégia (strategy pattern). Por exemplo, em um projeto que eu desenvolvi, criei uma classe que se encarregava de processar pagamentos, mas queria permitir que diferentes gateways de pagamento fossem usados. Para isso, criei uma interface que definia a estratégia de pagamento e implementei diferentes classes que implementavam essa interface.

```typescript
// exemplo de estratégia de pagamento
interface PagamentoStrategy {
  processarPagamento(valor: number): void;
}

class PagamentoPayPal implements PagamentoStrategy {
  processarPagamento(valor: number): void {
    // lógica de pagamento com PayPal
  }
}

class PagamentoStripe implements PagamentoStrategy {
  processarPagamento(valor: number): void {
    // lógica de pagamento com Stripe
  }
}
```

## Liskov com generics
O princípio de Liskov afirma que as subclasses devem ser substituíveis pelas suas superclasses. Em TypeScript, podemos aplicar esse princípio usando generics. Por exemplo, em um projeto que eu desenvolvi, criei uma classe que se encarregava de processar dados, mas queria permitir que diferentes tipos de dados fossem processados. Para isso, criei uma classe genérica que podia trabalhar com diferentes tipos de dados.

```typescript
// exemplo de classe genérica
class DadosProcessor<T> {
  processarDados(dados: T): void {
    // lógica de processamento de dados
  }
}
```

## ISP com interfaces
O princípio da Segregação de Interface (ISP) afirma que as interfaces devem ser segregadas para que as classes não sejam forçadas a implementar métodos que não precisam. Em TypeScript, podemos aplicar esse princípio criando interfaces que definem apenas os métodos necessários. Por exemplo, em um projeto que eu desenvolvi, criei uma interface que definia os métodos necessários para uma classe que se encarregava de processar pedidos.

```typescript
// exemplo de interface
interface PedidoProcessor {
  processarPedido(pedido: Pedido): void;
}
```

## DIP com inversão
O princípio da Inversão de Dependência (DIP) afirma que as classes de alto nível não devem depender de classes de baixo nível, mas sim de abstrações. Em TypeScript, podemos aplicar esse princípio usando inversão de dependência. Por exemplo, em um projeto que eu desenvolvi, criei uma classe que se encarregava de processar pagamentos, mas queria permitir que diferentes gateways de pagamento fossem usados. Para isso, criei uma interface que definia a dependência e implementei diferentes classes que implementavam essa interface.

```typescript
// exemplo de inversão de dependência
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

## Exemplo completo
Aqui está um exemplo completo de como aplicar os princípios SOLID em TypeScript:

```typescript
// exemplo completo
interface AutenticacaoService {
  autenticar(usuario: string, senha: string): boolean;
}

class AutenticacaoServiceImpl implements AutenticacaoService {
  autenticar(usuario: string, senha: string): boolean {
    // lógica de autenticação
    return true;
  }
}

interface PagamentoStrategy {
  processarPagamento(valor: number): void;
}

class PagamentoPayPal implements PagamentoStrategy {
  processarPagamento(valor: number): void {
    // lógica de pagamento com PayPal
  }
}

class PagamentoStripe implements PagamentoStrategy {
  processarPagamento(valor: number): void {
    // lógica de pagamento com Stripe
  }
}

class DadosProcessor<T> {
  processarDados(dados: T): void {
    // lógica de processamento de dados
  }
}

interface PedidoProcessor {
  processarPedido(pedido: Pedido): void;
}

class PedidoProcessorImpl implements PedidoProcessor {
  processarPedido(pedido: Pedido): void {
    // lógica de processamento de pedidos
  }
}

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

## Conclusão
Resumindo, os princípios SOLID são fundamentais para criar uma arquitetura limpa e escalável em TypeScript. Ao aplicar esses princípios, podemos criar código que seja fácil de manter, entender e escalar. Aqui estão os principais takeaways:

* SRP: cada classe deve ter apenas uma responsabilidade
* Open/Closed: as classes devem ser abertas para extensão, mas fechadas para modificação
* Liskov: as subclasses devem ser substituíveis pelas suas superclasses
* ISP: as interfaces devem ser segregadas para que as classes não sejam forçadas a implementar métodos que não precisam
* DIP: as classes de alto nível não devem depender de classes de baixo nível, mas sim de abstrações

## Fontes
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/basic-types.html)
- [Design Patterns](https://en.wikipedia.org/wiki/Design_pattern_(computer_science))
## 📸 Crédito da imagem de capa
- **Imagem:** [Convento de Santa Maria de Aguiar - Castelo Rodrigo - Portugal (15669320394).jpg](https://commons.wikimedia.org/wiki/File%3AConvento_de_Santa_Maria_de_Aguiar_-_Castelo_Rodrigo_-_Portugal_%2815669320394%29.jpg)
- **Autor(a):** Vitor Oliveira from Torres Vedras, PORTUGAL
- **Licença:** [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) · via Wikimedia Commons
