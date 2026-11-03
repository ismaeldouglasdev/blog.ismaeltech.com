---
title: "Prisma ORM: como modelar banco de dados com TypeScript"
date: "2026-08-18"
category: "tutorial"
tags: ["prisma", "orm", "banco-de-dados", "typescript"]
excerpt: "Prisma ORM na prática: modelando o schema de um SaaS, relacionamentos, migrations seguras, query API avançada e indexing de performance."
share_hook: "Modelando o schema de um SaaS no Prisma: relacionamentos 1:1, 1:N e N:M, migrations seguras e a Query API avançada."
lang: "pt"
---

## Introdução: ORM vs query raw

> “Se a única forma que você conhece de conversar com o banco de dados é gritar **SQL**, está na hora de aprender a falar a língua dele.”  

Essa frase pode parecer clichê, mas captura bem a realidade de quem desenvolve aplicações modernas. Enquanto as consultas *raw* dão controle total, elas também trazem **carga cognitiva**, risco de *SQL injection* e manutenção dolorosa. Um **ORM** (Object‑Relational Mapping) abstrai a camada de persistência, permitindo que você trabalhe com objetos tipados, migrações versionadas e, o melhor de tudo, **autocompletar** e **validação** no seu editor.

O **Prisma** tem ganhado destaque no ecossistema TypeScript por combinar a produtividade de um ORM com a performance de consultas otimizadas. Neste artigo vamos percorrer todo o ciclo de vida de um modelo de dados – da definição do schema até a otimização de queries – usando um exemplo de **SaaS de gerenciamento de projetos**. Se você já usa Node.js/TypeScript, vai perceber que o Prisma pode ser o “cabo de segurança” que faltava na sua stack.

---

## Modelando o schema de um SaaS

Vamos começar definindo o que o nosso SaaS precisa:

| Entidade          | Descrição                                              |
|-------------------|--------------------------------------------------------|
| **User**          | Usuário da plataforma (admin, manager, member)        |
| **Organization** | Empresa ou time que agrupa usuários                    |
| **Project**       | Projeto dentro de uma organização                     |
| **Task**          | Tarefa pertencente a um projeto                        |
| **Invitation**    | Convite para novos usuários ingressarem na organização |


<figure>
  <img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-08-18-prisma-orm-como-modelar-banco-de-dados-com-typescript.jpg" alt="Exemplo de schema de banco de dados (diagrama do MediaWiki 1.41.0)." loading="lazy" />
  <figcaption>
    Exemplo de schema de banco de dados (diagrama do MediaWiki 1.41.0). — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AMediaWiki_1.41.0_database_schema.png">MediaWiki 1.41.0 database schema.png</a> por Nick Jenkins, Timo Tijhof —
    <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a> · via Wikimedia Commons
  </figcaption>
</figure>

### 1. Instalando o Prisma

```bash
npm install prisma --save-dev
npm install @prisma/client
npx prisma init
```

O comando `prisma init` cria a pasta `prisma/` com o arquivo `schema.prisma` e um `.env` para a conexão. Configure a variável `DATABASE_URL` apontando para seu PostgreSQL (ou MySQL, SQLite etc.).

### 2. Definindo o schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              String          @id @default(uuid())
  email           String          @unique
  name            String?
  passwordHash    String
  role            Role            @default(MEMBER)
  organizationId  String?
  organization    Organization?   @relation(fields: [organizationId], references: [id])
  invitationsSent Invitation[]    @relation("SentInvitations")
  invitationsRecv Invitation[]    @relation("ReceivedInvitations")
  tasks           Task[]          @relation("Assignee")
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model Organization {
  id          String   @id @default(uuid())
  name        String
  domain      String   @unique
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id])
  members     User[]   @relation("OrganizationMembers")
  projects    Project[]
  invitations Invitation[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Project {
  id              String   @id @default(uuid())
  name            String
  description     String?
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  tasks           Task[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([organizationId, name]) // busca rápida por nome dentro da org
}

model Task {
  id          String   @id @default(uuid())
  title       String
  description String?
  status      TaskStatus @default(TODO)
  priority    Int        @default(0)
  projectId   String
  project     Project    @relation(fields: [projectId], references: [id])
  assigneeId  String?
  assignee    User?      @relation("Assignee", fields: [assigneeId], references: [id])
  dueDate     DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([projectId, status])
  @@index([assigneeId, priority])
}

model Invitation {
  id               String   @id @default(uuid())
  email            String
  token            String   @unique
  expiresAt        DateTime
  organizationId   String
  organization     Organization @relation(fields: [organizationId], references: [id])
  senderId         String
  sender           User        @relation("SentInvitations", fields: [senderId], references: [id])
  receiverId       String?
  receiver         User?       @relation("ReceivedInvitations", fields: [receiverId], references: [id])
  createdAt        DateTime    @default(now())
  usedAt           DateTime?

  @@unique([email, organizationId])
}

enum Role {
  ADMIN
  MANAGER
  MEMBER
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}
```

**Dicas práticas**

* **UUID como PK** – evita colisões em ambientes distribuídos e simplifica a replicação.
* **Enums** – trazem segurança de tipo para status e papéis, evitando *magic strings*.
* **Indexes** – o Prisma permite declarar índices diretamente no schema (`@@index`). Eles são criados nas migrations, economizando tempo de tuning manual.

---

## Relacionamentos (1:1, 1:N, N:M)

### 1:1 – Usuário ↔ Organização (owner)

```prisma
model Organization {
  ownerId String
  owner   User @relation(fields: [ownerId], references: [id])
}
```

O `ownerId` é único por organização, garantindo que **apenas um** usuário seja dono. No Prisma, a relação 1:1 é declarada usando `@relation` e o campo de chave estrangeira.

### 1:N – Organização → Usuários (membros)

```prisma
model Organization {
  members User[] @relation("OrganizationMembers")
}
```

E no lado do `User`:

```prisma
model User {
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
}
```

O campo opcional (`?`) permite que um usuário ainda não pertença a nenhuma organização (por exemplo, durante o onboarding).

### N:M – Usuário ↔ Projeto (colaboradores)

Embora o exemplo acima não precise de N:M direto, caso queira permitir que **vários usuários colaborem em vários projetos**, basta criar uma tabela de junção automática:

```prisma
model Project {
  collaborators User[] @relation("ProjectCollaborators")
}

model User {
  projects UserProject[]
}

model UserProject {
  userId    String
  projectId String
  role      Role @default(MEMBER)

  user    User    @relation(fields: [userId], references: [id])
  project Project @relation(fields: [projectId], references: [id])

  @@id([userId, projectId]) // chave composta
}
```

**Tip:** Quando precisar de atributos extras na relação (ex.: *role* dentro de `UserProject`), crie explicitamente a tabela de junção como acima. Caso contrário, use a sintaxe simplificada (`User[]` / `Project[]`) que o Prisma cria a tabela de forma transparente.

---

## Migrations: versionando o banco de forma segura

Com o schema pronto, basta gerar a primeira migration:

```bash
npx prisma migrate dev --name init
```

O comando:

* Cria o banco (se ainda não existir);
* Executa a migration;
* Atualiza o cliente Prisma (`@prisma/client`).

### Fluxo de trabalho recomendado

| Etapa | Comando | Quando usar |
|------|---------|-------------|
| **Criar/alterar schema** | `npx prisma migrate dev --name <descrição>` | Durante desenvolvimento local |
| **Aplicar em produção** | `npx prisma migrate deploy` | CI/CD ou servidor de produção |
| **Reverter** | `npx prisma migrate reset` (dev) | Quando precisar limpar tudo localmente |
| **Ver histórico** | `npx prisma migrate status` | Auditar migrações pendentes |

#### Dica de ouro: **Never edit migrations manually**  
Se precisar mudar algo que já foi aplicado em produção, crie **uma nova migration**. O Prisma mantém um histórico em `prisma/migrations/` que funciona como um *git* do seu banco.

---

## Query API avançada

### 1. Selecionando campos específicos (select) e relações (include)

```ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getProjectWithTasks(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { priority: 'desc' },
      },
    },
  });

  return project;
}
```

*`include`* traz a relação inteira; *`select`* permite escolher apenas os campos que realmente serão usados, reduzindo o **payload**.

### 2. Paginação com cursor

```ts
async function listTasks(projectId: string, cursor?: string, take = 10) {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0, // pula o cursor atual
    take,
  });
  return tasks;
}
```

A paginação baseada em cursor evita o famoso problema do *offset* em tabelas grandes, mantendo a consistência mesmo quando linhas são inseridas ou removidas entre as requisições.

### 3. Operações atômicas com `transaction`

```ts
async function moveTaskToProject(taskId: string, newProjectId: string) {
  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: { projectId: newProjectId },
    }),
    prisma.project.update({
      where: { id: newProjectId },
      data: { updatedAt: new Date() },
    }),
  ]);
}
```

Transações garantem **ACID** em múltiplas operações – essencial quando você precisa atualizar mais de uma tabela simultaneamente (ex.: mover uma tarefa e atualizar o timestamp do projeto).

### 4. Upserts (insert ou update)

```ts
await prisma.invitation.upsert({
  where: { token },
  update: { expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  create: {
    token,
    email,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    organization: { connect: { id: orgId } },
    sender: { connect: { id: senderId } },
  },
});
```

Útil para **idempotência** em endpoints de webhook ou processos de importação.

---

## Prisma Client e validação

### Tipagem automática

Ao gerar o cliente (`npx prisma generate`), o TypeScript ganha **tipos 100% corretos**. Por exemplo:

```ts
// O compilador avisa se você tentar atribuir um número a email!
prisma.user.create({
  data: {
    email: 123, //  erro de compilação
    passwordHash: hash,
    role: 'ADMIN', //  aceita apenas valores do enum Role
  },
});
```

### Zod + Prisma: validação de entrada

Embora o Prisma valide o schema ao nível do banco, é boa prática validar **antes** de chegar ao Prisma. Um padrão popular é combinar **Zod** com o tipo gerado por Prisma:

```ts
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100).optional(),
  password: z.string().min(8),
  role: z.nativeEnum(Prisma.Role).optional(),
});

type CreateUserInput = z.infer<typeof createUserSchema>;

async function createUser(input: CreateUserInput) {
  const validated = createUserSchema.parse(input);
  const passwordHash = await hashPassword(validated.password);
  return prisma.user.create({
    data: {
      email: validated.email,
      name: validated.name,
      passwordHash,
      role: validated.role ?? Prisma.Role.MEMBER,
    },
  });
}
```

**Benefícios**

* Erros de validação são lançados **antes** de abrir conexão com o banco.
* Mensagens de erro mais amigáveis para o cliente.
* Mantém a camada de domínio limpa e tipada.

---

## Performance e indexing

### 1. Use `@@index` e `@unique` estrategicamente

* **Campos de busca frequente** – `email`, `domain`, `organizationId + name`.
* **Filtros combinados** – `projectId + status` para listagem de tarefas.
* **Ordenação** – índices que suportam `ORDER BY` evitam *filesort*.

### 2. Evite o problema **N+1** com `include`

Sem `include`, ao buscar projetos você pode acabar disparando uma query por projeto para trazer as tasks. Use `include` ou **batch loading**:

```ts
const projects = await prisma.project.findMany({
  include: { tasks: true }, // traz tudo em 1 query
});
```

### 3. `select` vs `include` – quando usar?

* **`select`**: quando você só precisa de alguns campos da relação (ex.: lista de nomes de usuários).
* **`include`**: quando precisa da relação completa ou de filtros avançados dentro dela.

### 4. Cache de leitura

Para endpoints de alta frequência (ex.: dashboard de métricas), combine o Prisma com **Redis**:

```ts
async function getTaskStats(projectId: string) {
  const cacheKey = `task-stats:${projectId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const stats = await prisma.task.groupBy({
    by: ['status'],
    where: { projectId },
    _count: true,
  });

  await redis.set(cacheKey, JSON.stringify(stats), 'EX', 60); // 1 min TTL
  return stats;
}
```

### 5. Monitoramento com `prisma.$on('query')`

```ts
prisma.$on('query', (e) => {
  console.log(`[${e.duration}ms] ${e.query}`);
});
```

Logar a duração das queries ajuda a identificar gargalos antes que eles apareçam em produção.

---

## Conclusão

O Prisma não é apenas um *wrapper* de SQL; ele é um **framework de modelagem de dados** que traz tipagem forte, migrations automáticas e uma API fluente para consultas avançadas. Quando usado corretamente, ele reduz o tempo de desenvolvimento, melhora a segurança e ainda entrega performance competitiva com consultas *raw* bem escritas.

Ao modelar um SaaS, a clareza do schema – com enums, relações bem definidas e índices – paga dividendos ao longo do ciclo de vida da aplicação. Combine isso com boas práticas de validação (Zod), transações atômicas e monitoramento de queries, e você terá uma fundação robusta para escalar sem surpresas.

> **Prisma + TypeScript = menos bugs, mais produtividade e um código que realmente conversa com o banco.**  

---

## Takeaways práticos

- **Comece sempre com o schema**: defina PKs como UUID, use enums e crie índices (`@@index`) no próprio arquivo `.prisma`.
- **Migrations são seu controle de versão**: nunca edite arquivos de migração; crie novas ao mudar o modelo.
- **Use `select`/`include` sabiamente** para evitar payloads gigantes ou o problema N+1.
- **Transações (`$transaction`)** são indispensáveis em operações que tocam múltiplas tabelas.
- **Valide antes de salvar**: combine Zod (ou Yup) com os tipos gerados pelo Prisma.
- **Cache de leitura**: Redis + Prisma = dashboard rápido sem sobrecarregar o DB.
- **Monitore queries**: `prisma.$on('query')` ajuda a detectar queries lentas em desenvolvimento.
- **Teste migrations em staging** antes de rodar `prisma migrate deploy` em produção.
- **Documente enums e relações** no README da equipe; isso evita “surpresas” quando novos devs entram no projeto.

Com essas práticas, você estará pronto para levar seu SaaS ao próximo nível, tirando o máximo proveito do Prisma ORM e da tipagem do TypeScript. Boa codificação!  

## Fontes
- [Prisma Docs](https://www.prisma.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Understanding SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [Zod Documentation](https://zod.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
## 📸 Crédito da imagem de capa
- **Imagem:** [MediaWiki 1.10 database schema.png](https://commons.wikimedia.org/wiki/File%3AMediaWiki_1.10_database_schema.png)
- **Autor(a):** Nick Jenkins, but also containing information from other MediaWiki devs + contributors to MediaWiki.org
- **Licença:** [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · via Wikimedia Commons
