---
title: "API GraphQL com Apollo Server e Client: do zero ao completo"
date: "2026-09-13"
category: "tutorial"
tags: ["graphql", "apollo", "api"]
excerpt: "GraphQL com Apollo Server e Client: Do Zero ao Completo."
share_hook: "Do schema aos resolvers e ao Apollo Client: por que over-fetching mata e o que o GraphQL resolve de fato."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-09-13-api-graphql-com-apollo-server-e-client-do-zero-ao-completo.jpg"
comments: true
translationKey: "2026-09-13-api-graphql-com-apollo-server-e-client-do-zero-ao-completo"
---


APIs REST dominaram o desenvolvimento web por mais de uma década, mas carregam limitações que se tornaram cada vez mais evidentes conforme aplicações cresceram em complexidade. Over-fetching de dados, múltiplas requisições para carregar uma única tela, e a rigidez dos endpoints fixos criaram gargalos reais em projetos modernos. GraphQL surge como uma alternativa que coloca o cliente no controle, permitindo buscar exatamente os dados necessários em uma única requisição.

O Apollo ecosystem se estabeleceu como o padrão de facto para implementar GraphQL, oferecendo tanto o server quanto o client com ferramentas maduras e bem documentadas. A combinação de Apollo Server no backend com Apollo Client no React cria uma stack poderosa que resolve problemas reais de performance e developer experience.

## GraphQL vs REST: Além do Hype

A diferença fundamental entre GraphQL e REST não é apenas filosófica. REST força você a trabalhar com endpoints fixos, cada um retornando uma estrutura de dados predefinida. Se você precisa de dados de usuário e seus posts, terá que fazer pelo menos duas requisições: uma para `/users/123` e outra para `/users/123/posts`. GraphQL permite combinar essas necessidades em uma única query declarativa.

```graphql
query GetUserWithPosts {
  user(id: "123") {
    name
    email
    posts {
      title
      publishedAt
    }
  }
}
```

Essa flexibilidade resolve problemas práticos. Em aplicações mobile, onde bandwidth importa, você pode buscar apenas os campos necessários para cada tela. Em dashboards complexos, uma única requisição pode popular múltiplos componentes sem over-fetching.

O type system do GraphQL também traz benefícios concretos. Enquanto REST depende de documentação externa (que frequentemente fica desatualizada), GraphQL é self-documenting. O schema serve como contrato entre frontend e backend, e ferramentas como GraphQL Code Generator podem criar tipos TypeScript automaticamente.

## Schema: O Coração do GraphQL

O schema define o que é possível fazer com sua API. É aqui que você modela seus dados e operações de forma declarativa. Um schema bem estruturado facilita tanto o desenvolvimento quanto a manutenção.

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
  createdAt: String!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  publishedAt: String
  isPublished: Boolean!
}

type Query {
  users: [User!]!
  user(id: ID!): User
  posts: [Post!]!
  post(id: ID!): Post
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  createPost(input: CreatePostInput!): Post!
  publishPost(id: ID!): Post!
}

input CreateUserInput {
  name: String!
  email: String!
}

input CreatePostInput {
  title: String!
  content: String!
  authorId: ID!
}
```

O uso de `!` indica campos obrigatórios, enquanto sua ausência permite valores nulos. Types como `ID` são scalars especiais que o GraphQL reconhece. Input types são necessários para mutations - você não pode usar types regulares como argumentos.

## Resolvers: Conectando Schema à Realidade

Resolvers são funções que buscam os dados para cada campo do schema. Cada field pode ter seu próprio resolver, criando uma arquitetura flexível onde você controla exatamente como cada dado é obtido.

```javascript
const resolvers = {
  Query: {
    users: async () => {
      return await User.findAll();
    },
    user: async (parent, { id }) => {
      return await User.findByPk(id);
    },
    posts: async () => {
      return await Post.findAll();
    },
    post: async (parent, { id }) => {
      return await Post.findByPk(id);
    }
  },

  Mutation: {
    createUser: async (parent, { input }) => {
      const user = await User.create(input);
      return user;
    },
    createPost: async (parent, { input }) => {
      const post = await Post.create(input);
      return post;
    },
    publishPost: async (parent, { id }) => {
      const post = await Post.findByPk(id);
      if (!post) {
        throw new Error('Post not found');
      }
      
      post.isPublished = true;
      post.publishedAt = new Date().toISOString();
      await post.save();
      
      return post;
    }
  },

  User: {
    posts: async (parent) => {
      return await Post.findAll({ 
        where: { authorId: parent.id } 
      });
    }
  },

  Post: {
    author: async (parent) => {
      return await User.findByPk(parent.authorId);
    }
  }
};
```

Note como resolvers seguem a estrutura do schema. O resolver `User.posts` só é executado quando o campo `posts` é solicitado na query, evitando N+1 problems através de lazy loading natural.

## Apollo Server: Setup e Configuração

Apollo Server simplifica drasticamente a criação de um servidor GraphQL. Com poucas linhas, você tem um servidor funcional com playground interativo incluído.

```javascript
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { gql } = require('graphql-tag');

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
  }
  
  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    isPublished: Boolean!
  }
  
  type Query {
    users: [User!]!
    user(id: ID!): User
  }
  
  type Mutation {
    createUser(input: CreateUserInput!): User!
  }
  
  input CreateUserInput {
    name: String!
    email: String!
  }
`;

const server = new ApolloServer({
  typeDefs,
  resolvers,
  csrfPrevention: true,
  cache: 'bounded',
  plugins: [
    // Plugin para logging de queries
    {
      requestDidStart() {
        return {
          didResolveOperation(requestContext) {
            console.log('Query:', requestContext.request.query);
          }
        };
      }
    }
  ]
});

async function startServer() {
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }) => {
      // Contexto compartilhado entre todos os resolvers
      return {
        token: req.headers.authorization,
        dataSources: {
          userAPI: new UserAPI(),
          postAPI: new PostAPI()
        }
      };
    }
  });
  
  console.log(`🚀 Server ready at: ${url}`);
}

startServer();
```

O context é especialmente útil para passar dependências como conexões de banco, APIs externas, ou dados de autenticação para todos os resolvers.

## Apollo Client: Integrando com React

No frontend, Apollo Client oferece hooks que simplificam drasticamente o gerenciamento de estado para dados remotos. A integração com React é natural e poderosa.

```javascript
// apollo-client.js
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: 'http://localhost:4000/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      User: {
        fields: {
          posts: {
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            }
          }
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all'
    },
    query: {
      errorPolicy: 'all'
    }
  }
});

export default client;
```

```jsx
// App.js
import { ApolloProvider } from '@apollo/client';
import client from './apollo-client';
import UserList from './components/UserList';

function App() {
  return (
    <ApolloProvider client={client}>
      <div className="App">
        <UserList />
      </div>
    </ApolloProvider>
  );
}

export default App;
```

## Queries e Mutations na Prática

Os hooks do Apollo Client tornam o consumo de dados GraphQL intuitivo. `useQuery` para leitura, `useMutation` para escrita, ambos com loading states e error handling automáticos.

```jsx
import { gql, useQuery, useMutation } from '@apollo/client';
import { useState } from 'react';

const GET_USERS = gql`
  query GetUsers {
    users {
      id
      name
      email
      posts {
        id
        title
        isPublished
      }
    }
  }
`;

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
    }
  }
`;

function UserList() {
  const [showForm, setShowForm] = useState(false);
  const { loading, error, data, refetch } = useQuery(GET_USERS);
  const [createUser, { loading: creating }] = useMutation(CREATE_USER, {
    onCompleted: () => {
      setShowForm(false);
      refetch(); // Recarrega a lista
    },
    onError: (error) => {
      console.error('Erro ao criar usuário:', error);
    }
  });

  const handleSubmit = (formData) => {
    createUser({
      variables: {
        input: {
          name: formData.name,
          email: formData.email
        }
      }
    });
  };

  if (loading) return <div>Carregando usuários...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div>
      <h2>Usuários ({data.users.length})</h2>
      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? 'Cancelar' : 'Novo Usuário'}
      </button>
      
      {showForm && (
        <CreateUserForm 
          onSubmit={handleSubmit} 
          loading={creating} 
        />
      )}
      
      <div className="user-grid">
        {data.users.map(user => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}

function UserCard({ user }) {
  const publishedPosts = user.posts.filter(post => post.isPublished);
  
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <span>{publishedPosts.length} posts publicados</span>
    </div>
  );
}
```

## Caching: O Superpoder do Apollo Client

O InMemoryCache do Apollo é mais que um cache simples - é um store normalizado que evita duplicação de dados e mantém consistência automática. Quando você atualiza um objeto em qualquer lugar, todas as queries que o referenciam são atualizadas automaticamente.

```javascript
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        posts: {
          merge(existing = [], incoming, { args }) {
            // Implementa paginação no cache
            if (args?.offset === 0) {
              return incoming;
            }
            return [...existing, ...incoming];
          }
        }
      }
    },
    Post: {
      fields: {
        comments: {
          merge(existing = [], incoming) {
            const existingIds = existing.map(comment => comment.__ref);
            const newComments = incoming.filter(
              comment => !existingIds.includes(comment.__ref)
            );
            return [...existing, ...newComments];
          }
        }
      }
    }
  }
});

// Atualização manual do cache após mutation
const [publishPost] = useMutation(PUBLISH_POST, {
  update(cache, { data: { publishPost } }) {
    // Atualiza o objeto no cache
    cache.modify({
      id: cache.identify(publishPost),
      fields: {
        isPublished: () => true,
        publishedAt: () => publishPost.publishedAt
      }
    });
    
    // Adiciona à lista de posts publicados
    cache.modify({
      fields: {
        publishedPosts(existingPosts = []) {
          const newPostRef = cache.writeFragment({
            data: publishPost,
            fragment: gql`
              fragment NewPost on Post {
                id
                title
                publishedAt
              }
            `
          });
          
          return [...existingPosts, newPostRef];
        }
      }
    });
  }
});
```

## Error Handling: Além do Happy Path

GraphQL permite errors parciais - você pode receber dados válidos junto com errors específicos. Apollo Client oferece várias estratégias para lidar com isso.

```jsx
import { gql, useQuery, useErrorHandler } from '@apollo/client';

const GET_USER_DASHBOARD = gql`
  query GetUserDashboard($userId: ID!) {
    user(id: $userId) {
      id
      name
      email
      stats {
        totalPosts
        totalViews
        monthlyRevenue
      }
      recentPosts {
        id
        title
        views
      }
    }
  }
`;

function UserDashboard({ userId }) {
  const handleError = useErrorHandler();
  
  const { loading, error, data } = useQuery(GET_USER_DASHBOARD, {
    variables: { userId },
    errorPolicy: 'all', // Retorna dados parciais mesmo com errors
    notifyOnNetworkStatusChange: true,
    onError: (error) => {
      // Log de errors que não impedem a renderização
      if (error.graphQLErrors?.length > 0) {
        error.graphQLErrors.forEach(gqlError => {
          if (gqlError.extensions?.code === 'STATISTICS_UNAVAILABLE') {
            console.warn('Estatísticas temporariamente indisponíveis');
          } else {
            handleError(gqlError);
          }
        });
      }
    }
  });

  if (loading && !data) return <LoadingSkeleton />;
  
  if (error && !data) {
    return (
      <ErrorBoundary>
        <div>Erro ao carregar dashboard: {error.message}</div>
        <button onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </ErrorBoundary>
    );
  }

  const user = data?.user;
  const hasStatsError = error?.graphQLErrors?.some(
    err => err.extensions?.code === 'STATISTICS_UNAVAILABLE'
  );

  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard - {user?.name}</h1>
        <p>{user?.email}</p>
      </header>
      
      <section className="stats">
        <h2>Estatísticas</h2>
        {hasStatsError ? (
          <div className="error-message">
            Estatísticas temporariamente indisponíveis
          </div>
        ) : (
          <StatsGrid stats={user?.stats} />
        )}
      </section>
      
      <section className="recent-posts">
        <h2>Posts Recentes</h2>
        {user?.recentPosts?.map(post => (
          <PostItem key={post.id} post={post} />
        ))}
      </section>
    </div>
  );
}
```

## Subscriptions: Dados em Tempo Real

Subscriptions permitem que o servidor envie atualizações para clientes conectados quando dados mudam. Útil para chats, notificações, ou qualquer feature que precisa de updates em tempo real.

```javascript
// Server
const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();

const typeDefs = gql`
  type Subscription {
    postAdded: Post!
    postUpdated(authorId: ID!): Post!
  }
  
  type Mutation {
    createPost(input: CreatePostInput!): Post!
  }
`;

const resolvers = {
  Subscription: {
    postAdded: {
      subscribe: () => pubsub.asyncIterator(['POST_ADDED'])
    },
    postUpdated: {
      subscribe: (parent, { authorId }) => 
        pubsub.asyncIterator([`POST_UPDATED_${authorId}`])
    }
  },
  
  Mutation: {
    createPost: async (parent, { input }) => {
      const post = await Post.create(input);
      
      // Notifica subscribers
      pubsub.publish('POST_ADDED', { postAdded: post });
      pubsub.publish(`POST_UPDATED_${input.authorId}`, { 
        postUpdated: post 
      });
      
      return post;
    }
  }
};
```

```jsx
// Client
import { gql, useSubscription, useQuery } from '@apollo/client';

const POST_ADDED_SUBSCRIPTION = gql`
  subscription PostAdded {
    postAdded {
      id
      title
      author {
        name
      }
      publishedAt
    }
  }
`;

const GET_RECENT_POSTS = gql`
  query GetRecentPosts {
    posts(limit: 10, orderBy: "publishedAt_DESC") {
      id
      title
      author {
        name
      }
      publishedAt
    }
  }
`;

function RecentPostsFeed() {
  const { data: postsData, loading } = useQuery(GET_RECENT_POSTS);
  
  useSubscription(POST_ADDED_SUBSCRIPTION, {
    onSubscriptionData: ({ subscriptionData, client }) => {
      const newPost = subscriptionData.data.postAdded;
      
      // Atualiza o cache com o novo post
      client.cache.modify({
        fields: {
          posts(existingPosts = []) {
            const newPostRef = client.cache.writeFragment({
              data: newPost,
              fragment: gql`
                fragment NewPost on Post {
                  id
                  title
                  author {
                    name
                  }
                  publishedAt
                }
              `
            });
            
            return [newPostRef, ...existingPosts.slice(0, 9)];
          }
        }
      });
      
      // Mostra notificação
      showNotification(`Novo post: ${newPost.title}`);
    }
  });

  if (loading) return <PostsSkeleton />;

  return (
    <div className="posts-feed">
      <h2>Posts Recentes</h2>
      {postsData?.posts?.map(post => (
        <PostPreview key={post.id} post={post} />
      ))}
    </div>
  );
}
```

## Otimizações e Best Practices

Algumas práticas que fazem diferença real em aplicações GraphQL de produção:

**Fragmentação de queries** ajuda a reutilizar seleções de campos e manter consistência:

```javascript
const USER_FRAGMENT = gql`
  fragment UserInfo on User {
    id
    name
    email
    avatar
  }
`;

const GET_POST_WITH_AUTHOR = gql`
  ${USER_FRAGMENT}
  
  query GetPost($id: ID!) {
    post(id: $id) {
      id
      title
      content
      author {
        ...UserInfo
      }
    }
  }
`;
```

**Query batching** combina múltiplas queries em uma única requisição HTTP:

```javascript
const client = new ApolloClient({
  link: new BatchHttpLink({
    uri: '/graphql',
    batchMax: 5,
    batchInterval: 20
  }),
  cache: new InMemoryCache()
});
```

**Persisted queries** reduzem bandwidth enviando apenas hashes das queries:

```javascript
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { sha256 } from 'crypto-hash';

const persistedQueriesLink = createPersistedQueryLink({ sha256 });

const client = new ApolloClient({
  link: from([persistedQueriesLink, httpLink]),
  cache: new InMemoryCache()
});
```

GraphQL com Apollo Server e Client oferece uma base sólida para APIs modernas. A capacidade de buscar exatamente os dados necessários, o caching inteligente, e a integração natural com React resolvem problemas reais que REST não consegue abordar elegantemente. 

O investimento inicial em aprender GraphQL compensa rapidamente quando você percebe que não precisa mais gerenciar manualmente loading states, sincronização de cache, ou fazer múltiplas requisições para carregar uma tela. É uma mudança de paradigma que, uma vez adotada, torna difícil voltar para APIs REST tradicionais.

### Takeaways Práticos

- GraphQL resolve over-fetching e under-fetching de forma elegante, especialmente importante em aplicações mobile
- Apollo Client elimina boilerplate de gerenciamento de estado para dados remotos
- O cache normalizado mantém consistência automática entre diferentes partes da aplicação
- Subscriptions permitem features em tempo real sem complexidade adicional no cliente
- Error policies flexíveis permitem UX graceful mesmo com falhas parciais
- Fragmentos de queries promovem reutilização e consistência de código
- O ecossistema Apollo oferece ferramentas maduras para debugging e otimização

## Fontes

- [Apollo Server Documentation](https://www.apollographql.com/docs/apollo-server/)
- [Apollo Client Documentation](https://www.apollographql.com/docs/react/)
- [GraphQL Specification](https://graphql.org/learn/)
- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)
- [React Apollo Hooks Guide](https://www.apollographql.com/docs/react/api/react/hooks/)
## 📸 Crédito da imagem de capa
- **Imagem:** [Bob van Luijt presenting Weaviate's GraphQL APi.jpg](https://commons.wikimedia.org/wiki/File%3ABob_van_Luijt_presenting_Weaviate%27s_GraphQL_APi.jpg)
- **Autor(a):** Bvl85
- **Licença:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) · via Wikimedia Commons
