---
title: "WebSocket from scratch: real-time chat with Node.js and React"
date: "2026-09-09"
category: "tutorial"
tags: ["websocket", "real-time", "node", "react"]
excerpt: "Build a real-time chat application from scratch using WebSocket, Node.js, and React. Learn how WebSocket works and integrate it into a full-stack project."
share_hook: "From handshake to reconnect: how a realtime chat actually works."
cover:
  image: "/covers/2026-09-09-websocket-do-zero-chat-em-tempo-real-com-node-js-e-react.jpg"
comments: true
translationKey: "2026-09-09-websocket-do-zero-chat-em-tempo-real-com-node-js-e-react"
---

Building a real-time chat application may seem like a challenging task, but with the right tools it is possible to create a working application in a matter of hours. One of the main challenges developers face when building interactive applications is choosing the communication protocol. While HTTP is widely used for exchanging data between client and server, it is not the most efficient option for applications that require real-time communication, such as a chat. That is where WebSocket shines.

### HTTP vs WebSocket

HTTP is a communication protocol based on requests and responses, where the client sends a request to the server and waits for a response. This works perfectly for many applications, but it is not ideal for scenarios that require real-time updates. WebSocket, on the other hand, is a protocol that enables persistent bidirectional communication between the client and the server. Once a WebSocket connection is established, both the server and the client can send messages at any time, resulting in more efficient and faster communication.

### Socket.IO server

To start building our chat, we will use Socket.IO, a library that makes implementing WebSockets easier. Installation is simple and can be done using npm:

```bash
npm install socket.io
```

Now, let's create a basic server in Node.js. The following code sets up an HTTP server and integrates Socket.IO:

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

In this code, we create a server that listens for WebSocket connections. When a user connects, a message is displayed in the console. When a chat message is received, the server relays it to all connected users.

### React client with context

For the client side, we will use React and create a context to manage the state of our application. First, install the Socket.IO client library:

```bash
npm install socket.io-client
```

Then, create a context for the chat:

```javascript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const ChatContext = createContext();


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-09-websocket-do-zero-chat-em-tempo-real-com-node-js-e-react-1.jpg" alt="WebSocket from scratch: real-time chat with Node.js and React" loading="lazy">
<figcaption>Resolved. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AEncrypted_Websocket_Issue.png">Encrypted Websocket Issue.png</a> por VaYshaleee — <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> · via Wikimedia Commons</figcaption>
</figure>

export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const socket = io('http://localhost:3000');

    useEffect(() => {
        socket.on('chat message', (msg) => {
            setMessages((prevMessages) => [...prevMessages, msg]);
        });

        return () => {
            socket.off('chat message');
        };
    }, [socket]);

    const sendMessage = (msg) => {
        socket.emit('chat message', msg);
    };

    return (
        <ChatContext.Provider value={{ messages, sendMessage }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    return useContext(ChatContext);
};
```

In this code, we establish a connection with the server and listen for chat messages. When a new message arrives, it is added to the `messages` state. The `sendMessage` method is used to send messages to the server.

### Rooms and broadcast

Now that we have a basic structure, we can implement the rooms feature. Socket.IO allows users to join specific rooms, enabling group communication. To do this, let's modify our server:

```javascript
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('join room', (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
    });

    socket.on('chat message', ({ room, msg }) => {
        io.to(room).emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
```

On the client side, let's allow the user to choose a room before sending messages. To do this, expand the context:

```javascript
const sendMessage = (room, msg) => {
    socket.emit('chat message', { room, msg });
};
```

### Message persistence

To make our application more robust, it is important to implement a message persistence system. This can be done using a database. In this example, we will use MongoDB to store the messages. First, install the `mongoose` library:

```bash
npm install mongoose
```

Then, configure the MongoDB connection and the message model:


```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/chat', { useNewUrlParser: true, useUnifiedTopology: true });

const messageSchema = new mongoose.Schema({
    room: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);
```

Now, whenever a message is received, let's save it to the database:

```javascript
socket.on('chat message', async ({ room, msg }) => {
    const message = new Message({ room, content: msg });
    await message.save();
    io.to(room).emit('chat message', msg);
});
```

### Reconnection and fallback

One of the most important aspects of working with WebSockets is managing reconnections and implementing fallbacks. Socket.IO already has a basic reconnection implementation that will try to reconnect the client in case of a lost connection. However, it is always good to have a fallback strategy.

We can check the client connection and, if a disconnection occurs, display a message to the user:

```javascript
useEffect(() => {
    socket.on('connect', () => {
        console.log('Reconnected to the server');
    });

    socket.on('disconnect', () => {
        console.log('Connection lost');
    });
}, [socket]);
```

### Production: scaling

When your application starts to gain popularity, it is crucial to think about scalability. Socket.IO can be scaled horizontally using an adapter such as `socket.io-redis`, which allows multiple server instances to communicate with each other. To do this, install the adapter:

```bash
npm install socket.io-redis
```

Then, configure Redis on your server:

```javascript
const redisAdapter = require('socket.io-redis');

io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));
```

This will allow your Socket.IO server instances to share events, ensuring that messages sent on one instance are received by all the others.

### Conclusion

Creating a real-time chat with WebSockets using Node.js and React is quite an accessible task and offers a great opportunity to learn about bidirectional communication. Here, we covered everything from the basic setup to implementing features like rooms, message persistence and scalability.

### Practical takeaways:
- WebSocket is ideal for applications that require real-time communication.
- Socket.IO simplifies WebSocket implementation, offering additional features.
- Message persistence is essential to improve the user experience.
- Reconnection and fallback management is crucial for application robustness.
- Think about scalability from the start, using tools like `socket.io-redis`.

## Sources
- [Socket.IO documentation](https://socket.io/docs/v4/)
- [Express documentation](https://expressjs.com/en/)
- [Mongoose documentation](https://mongoosejs.com/docs/)
- [MongoDB documentation](https://www.mongodb.com/docs/)
- [Socket.IO Redis Adapter](https://socket.io/docs/v4/adapter/#redis-adapter)
## 📸 Cover image credit

<figure>
<img src="/covers/2026-09-09-websocket-do-zero-chat-em-tempo-real-com-node-js-e-react.jpg" alt="WebSocket from scratch: real-time chat with Node.js and React" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>
- **Image:** [Apollo Guidance Computer (AGC).jpg](https://commons.wikimedia.org/wiki/File%3AApollo_Guidance_Computer_%28AGC%29.jpg)
- **Author:** Steve Jurvetson
- **License:** [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) · via Wikimedia Commons