---
title: "GraphQL API with Apollo Server and Client: Complete Guide"
date: "2026-09-13"
category: "tutorial"
tags: ["graphql", "apollo", "api"]
excerpt: "GraphQL with Apollo Server and Client: From Zero to Complete."
share_hook: "From schema to resolvers to Apollo Client: over-fetching and what GraphQL actually fixes."
cover:
  image: "/covers/2026-09-13-api-graphql-com-apollo-server-e-client-do-zero-ao-completo.jpg"
comments: true
translationKey: "2026-09-13-api-graphql-com-apollo-server-e-client-do-zero-ao-completo"
---


REST APIs dominated web development for more than a decade, but carry limitations that became increasingly evident as applications grew in complexity. Over-fetching of data, multiple requests to load a single screen, and the rigidity of fixed endpoints created real bottlenecks in modern projects. GraphQL emerges as an alternative that puts the client in control, allowing you to fetch exactly the data needed in a single request.

The Apollo ecosystem has established itself as the de facto standard for implementing GraphQL, offering both server and client with mature and well-documented tools. The combination of Apollo Server on the backend with Apollo Client in React creates a powerful stack that solves real performance and developer experience problems.

## GraphQL vs REST: Beyond the Hype

The fundamental difference between GraphQL and REST isn't just philosophical. REST forces you to work with fixed endpoints, each returning a predefined data structure. If you need user data and their posts, you'll have to make at least two requests: one to `/users/123` and another to `/users/123/posts`. GraphQL allows you to combine these needs into a single declarative query.

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

This flexibility solves practical problems. In mobile applications, where bandwidth matters, you can fetch only the fields needed for each screen. In complex dashboards, a single request can populate multiple components without over-fetching.

GraphQL's type system also brings concrete benefits. While REST depends on external documentation (which frequently becomes outdated), GraphQL is self-documenting. The schema serves as a contract between frontend and backend, and tools like GraphQL Code Generator can automatically create TypeScript types.

## Schema: The Heart of GraphQL

The schema defines what's possible to do with your API. This is where you model your data and operations in a declarative way. A well-structured schema makes both development and maintenance easier.


<figure>
<img src="/media/2026-09-13-api-graphql-com-apollo-server-e-client-do-zero-ao-completo-1.jpg" alt="GraphQL API with Apollo Server and Client: Complete Guide" loading="lazy">
<figcaption>GraphQL is an open-source query language and runtime for APIs that enables clients to request specific data from a server in a single request, rather than makin. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AGraphQL_%2853046906070%29.jpg">GraphQL (53046906070).jpg</a> por Exey Panteleev — <a href="https://creativecommons.org/licenses/by/2.0">CC BY 2.0</a> · via Wikimedia Commons</figcaption>
</figure>

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

The use of `!` indicates required fields, while its absence allows null values. Types like `ID` are special scalars that GraphQL recognizes. Input types are necessary for mutations - you cannot use regular types as arguments.

## Resolvers: Connecting Schema to Reality

Resolvers are functions that fetch data for each field in the schema. Each field can have its own resolver, creating a flexible architecture where you control exactly how each piece of data is obtained.

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

Note how resolvers follow the schema structure. The `User.posts` resolver is only executed when the `posts` field is requested in the query, avoiding N+1 problems through natural lazy loading.

## Apollo Server: Setup and Configuration

Apollo Server dramatically simplifies creating a GraphQL server. With just a few lines, you have a functional server with an interactive playground included.


<figure>
<img src="/media/2026-09-13-api-graphql-com-apollo-server-e-client-do-zero-ao-completo-2.jpg" alt="GraphQL API with Apollo Server and Client: Complete Guide" loading="lazy">
<figcaption>Bob van Luijt presenting Weaviate's GraphQL APi. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3ABob_van_Luijt_presenting_Weaviate%27s_GraphQL_APi.jpg">Bob van Luijt presenting Weaviate&#x27;s GraphQL APi.jpg</a> por Bvl85 — <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> · via Wikimedia Commons</figcaption>
</figure>
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
    // Plugin for query logging
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
      // Shared context between all resolvers
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

The context is especially useful for passing dependencies like database connections, external APIs, or authentication data to all resolvers.

## Apollo Client: Integrating with React

On the frontend, Apollo Client provides hooks that dramatically simplify state management for remote data. The integration with React is natural and powerful.

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

## Queries and Mutations in Practice

Apollo Client hooks make consuming GraphQL data intuitive. `useQuery` for reading, `useMutation` for writing, both with automatic loading states and error handling.

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
      refetch(); // Reloads the list
    },
    onError: (error) => {
      console.error('Error creating user:', error);
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

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Users ({data.users.length})</h2>
      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? 'Cancel' : 'New User'}
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
      <span>{publishedPosts.length} published posts</span>
    </div>
  );
}
```

## Caching: The Apollo Client Superpower

Apollo's InMemoryCache is more than a simple cache - it's a normalized store that prevents data duplication and maintains automatic consistency. When you update an object anywhere, all queries that reference it are automatically updated.

```javascript
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        posts: {
          merge(existing = [], incoming, { args }) {
            // Implements cache pagination
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

// Manual cache update after mutation
const [publishPost] = useMutation(PUBLISH_POST, {
  update(cache, { data: { publishPost } }) {
    // Updates the object in cache
    cache.modify({
      id: cache.identify(publishPost),
      fields: {
        isPublished: () => true,
        publishedAt: () => publishPost.publishedAt
      }
    });
    
    // Adds to the published posts list
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

## Error Handling: Beyond the Happy Path

GraphQL allows partial errors - you can receive valid data along with specific errors. Apollo Client offers various strategies to handle this.

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
    errorPolicy: 'all', // Returns partial data even with errors
    notifyOnNetworkStatusChange: true,
    onError: (error) => {
      // Log errors that don't prevent rendering
      if (error.graphQLErrors?.length > 0) {
        error.graphQLErrors.forEach(gqlError => {
          if (gqlError.extensions?.code === 'STATISTICS_UNAVAILABLE') {
            console.warn('Statistics temporarily unavailable');
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
        <div>Error loading dashboard: {error.message}</div>
        <button onClick={() => window.location.reload()}>
          Try again
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
        <h2>Statistics</h2>
        {hasStatsError ? (
          <div className="error-message">
            Statistics temporarily unavailable
          </div>
        ) : (
          <StatsGrid stats={user?.stats} />
        )}
      </section>
      
      <section className="recent-posts">
        <h2>Recent Posts</h2>
        {user?.recentPosts?.map(post => (
          <PostItem key={post.id} post={post} />
        ))}
      </section>
    </div>
  );
}
```

## Subscriptions: Real-Time Data

Subscriptions allow the server to send updates to connected clients when data changes. Useful for chats, notifications, or any feature that needs real-time updates.

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
      
      // Notify subscribers
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
```

```javascript
function RecentPostsFeed() {
  const { data: postsData, loading } = useQuery(GET_RECENT_POSTS);
  
  useSubscription(POST_ADDED_SUBSCRIPTION, {
    onSubscriptionData: ({ subscriptionData, client }) => {
      const newPost = subscriptionData.data.postAdded;
      
      // Updates the cache with the new post
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
      
      // Shows notification
      showNotification(`New post: ${newPost.title}`);
    }
  });

  if (loading) return <PostsSkeleton />;

  return (
    <div className="posts-feed">
      <h2>Recent Posts</h2>
      {postsData?.posts?.map(post => (
        <PostPreview key={post.id} post={post} />
      ))}
    </div>
  );
}
```

## Optimizations and Best Practices

Some practices that make a real difference in production GraphQL applications:

**Query fragmentation** helps reuse field selections and maintain consistency:

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

**Query batching** combines multiple queries into a single HTTP request:

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

**Persisted queries** reduce bandwidth by sending only query hashes:

```javascript
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { sha256 } from 'crypto-hash';

const persistedQueriesLink = createPersistedQueryLink({ sha256 });

const client = new ApolloClient({
  link: from([persistedQueriesLink, httpLink]),
  cache: new InMemoryCache()
});
```

GraphQL with Apollo Server and Client offers a solid foundation for modern APIs. The ability to fetch exactly the data you need, intelligent caching, and natural integration with React solve real problems that REST cannot address elegantly.

The initial investment in learning GraphQL quickly pays off when you realize you no longer need to manually manage loading states, cache synchronization, or make multiple requests to load a screen. It's a paradigm shift that, once adopted, makes it hard to go back to traditional REST APIs.

### Practical Takeaways

- GraphQL elegantly solves over-fetching and under-fetching, especially important in mobile applications
- Apollo Client eliminates boilerplate for remote data state management
- The normalized cache automatically maintains consistency across different parts of the application
- Subscriptions enable real-time features without additional complexity on the client
- Flexible error policies allow graceful UX even with partial failures
- Query fragments promote code reuse and consistency
- The Apollo ecosystem offers mature tools for debugging and optimization

## Sources

- [Apollo Server Documentation](https://www.apollographql.com/docs/apollo-server/)
- [Apollo Client Documentation](https://www.apollographql.com/docs/react/)
- [GraphQL Specification](https://graphql.org/learn/)
- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)
- [React Apollo Hooks Guide](https://www.apollographql.com/docs/react/api/react/hooks/)
## 📸 Cover image credit
- **Image:** [Bob van Luijt presenting Weaviate's GraphQL APi.jpg](https://commons.wikimedia.org/wiki/File%3ABob_van_Luijt_presenting_Weaviate%27s_GraphQL_APi.jpg)
- **Author:** Bvl85
- **License:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) · via Wikimedia Commons
