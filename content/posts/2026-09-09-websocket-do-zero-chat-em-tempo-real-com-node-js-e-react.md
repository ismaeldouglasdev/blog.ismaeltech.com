---
title: "WebSocket do zero: chat em tempo real com Node.js e React"
date: "2026-09-09"
category: "tutorial"
tags: ["websocket", "real-time", "node", "react"]
excerpt: "WebSocket do zero: chat em tempo real com Node.js e React."
share_hook: "Do handshake à reconexão: como funciona por dentro um chat em tempo real com Node.js e React."
cover:
  image: "/covers/2026-09-09-websocket-do-zero-chat-em-tempo-real-com-node-js-e-react.jpg"
comments: true
translationKey: "2026-09-09-websocket-do-zero-chat-em-tempo-real-com-node-js-e-react"
---

Construir um chat em tempo real pode parecer uma tarefa desafiadora, mas, com as ferramentas adequadas, é possível criar uma aplicação funcional em questão de horas. Um dos principais desafios que os desenvolvedores enfrentam ao criar aplicações interativas é a escolha do protocolo de comunicação. Enquanto o HTTP é amplamente utilizado para a troca de dados entre cliente e servidor, ele não é o mais eficiente para aplicações que exigem comunicação em tempo real, como um chat. É aí que o WebSocket se destaca.

### HTTP vs WebSocket

O HTTP é um protocolo de comunicação baseado em requisições e respostas, onde o cliente envia uma requisição ao servidor e aguarda uma resposta. Isso funciona perfeitamente para muitas aplicações, mas não é ideal para cenários que exigem atualizações em tempo real. O WebSocket, por outro lado, é um protocolo que permite uma comunicação bidirecional persistente entre o cliente e o servidor. Uma vez que uma conexão WebSocket é estabelecida, tanto o servidor quanto o cliente podem enviar mensagens a qualquer momento, resultando em uma comunicação mais eficiente e rápida.

### Socket.IO server

Para começar a construir nosso chat, vamos usar o Socket.IO, uma biblioteca que facilita a implementação de WebSockets. A instalação é simples e pode ser feita usando o npm:

```bash
npm install socket.io
```

Agora, vamos criar um servidor básico em Node.js. O código a seguir configura um servidor HTTP e integra o Socket.IO:

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
    console.log('Um usuário conectado');

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado');
    });
});

server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
```

Neste código, criamos um servidor que escuta conexões WebSocket. Quando um usuário se conecta, uma mensagem é exibida no console. Ao receber uma mensagem do chat, o servidor a retransmite para todos os usuários conectados.

### Client React com context

Para o lado do cliente, vamos usar React e criar um contexto para gerenciar o estado da nossa aplicação. Primeiro, instale a biblioteca Socket.IO client:

```bash
npm install socket.io-client
```

Em seguida, crie um contexto para o chat:

```javascript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const ChatContext = createContext();

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

Nesse código, estabelecemos uma conexão com o servidor e ouvimos as mensagens do chat. Quando uma nova mensagem chega, ela é adicionada ao estado `messages`. O método `sendMessage` é usado para enviar mensagens ao servidor.

### Salas e broadcast

Agora que temos uma estrutura básica, podemos implementar a funcionalidade de salas. O Socket.IO permite que os usuários se conectem a salas específicas, tornando possível a comunicação em grupo. Para isso, vamos modificar nosso servidor:

```javascript
io.on('connection', (socket) => {
    console.log('Um usuário conectado');

    socket.on('join room', (room) => {
        socket.join(room);
        console.log(`Usuário entrou na sala: ${room}`);
    });

    socket.on('chat message', ({ room, msg }) => {
        io.to(room).emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado');
    });
});
```

No lado do cliente, vamos permitir que o usuário escolha uma sala antes de enviar mensagens. Para isso, expanda o contexto:

```javascript
const sendMessage = (room, msg) => {
    socket.emit('chat message', { room, msg });
};
```

### Persistência de mensagens

Para tornar nossa aplicação mais robusta, é importante implementar um sistema de persistência de mensagens. Isso pode ser feito utilizando um banco de dados. Neste exemplo, utilizaremos o MongoDB para armazenar as mensagens. Primeiro, instale a biblioteca `mongoose`:

```bash
npm install mongoose
```

Em seguida, configure a conexão com o MongoDB e o modelo de mensagem:

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

Agora, sempre que uma mensagem for recebida, vamos salvá-la no banco de dados:

```javascript
socket.on('chat message', async ({ room, msg }) => {
    const message = new Message({ room, content: msg });
    await message.save();
    io.to(room).emit('chat message', msg);
});
```

### Reconexão e fallback

Um dos aspectos mais importantes ao trabalhar com WebSockets é a gestão de reconexões e a implementação de fallback. O Socket.IO já possui uma implementação básica de reconexão que tentará reconectar o cliente em caso de perda de conexão. No entanto, é sempre bom ter uma estratégia de fallback.

Podemos verificar a conexão do cliente e, caso ocorra uma desconexão, exibir uma mensagem para o usuário:

```javascript
useEffect(() => {
    socket.on('connect', () => {
        console.log('Reconectado ao servidor');
    });

    socket.on('disconnect', () => {
        console.log('Conexão perdida');
    });
}, [socket]);
```

### Produção: escalabilidade

Quando sua aplicação começa a ganhar popularidade, é crucial pensar em escalabilidade. O Socket.IO pode ser escalado horizontalmente usando um adaptador como o `socket.io-redis`, que permite que múltiplas instâncias do seu servidor se comuniquem entre si. Para isso, instale o adaptador:

```bash
npm install socket.io-redis
```

Em seguida, configure o Redis no seu servidor:

```javascript
const redisAdapter = require('socket.io-redis');

io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));
```

Isso permitirá que suas instâncias do servidor Socket.IO compartilhem eventos, garantindo que mensagens enviadas em uma instância sejam recebidas por todas as outras.

### Conclusão

Criar um chat em tempo real com WebSockets utilizando Node.js e React é uma tarefa bastante acessível e oferece uma ótima oportunidade para aprender sobre comunicação bidirecional. Aqui, cobrimos desde a configuração básica até a implementação de funcionalidades como salas, persistência de mensagens e escalabilidade.

### Takeaways práticos:
- O WebSocket é ideal para aplicações que exigem comunicação em tempo real.
- O Socket.IO simplifica a implementação de WebSockets, oferecendo funcionalidades adicionais.
- A persistência de mensagens é essencial para melhorar a experiência do usuário.
- A gestão de reconexão e fallback é crucial para a robustez da aplicação.
- Pense na escalabilidade desde o início, utilizando ferramentas como `socket.io-redis`.

## Fontes
- [Documentação do Socket.IO](https://socket.io/docs/v4/)
- [Documentação do Express](https://expressjs.com/pt-br/)
- [Documentação do Mongoose](https://mongoosejs.com/docs/)
- [Documentação do MongoDB](https://www.mongodb.com/docs/)
- [Socket.IO Redis Adapter](https://socket.io/docs/v4/adapter/#redis-adapter)
## 📸 Crédito da imagem de capa

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-09-websocket-do-zero-chat-em-tempo-real-com-node-js-e-react-1.jpg" alt="WebSocket do zero: chat em tempo real com Node.js e React" loading="lazy">
<figcaption>Resolved. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AEncrypted_Websocket_Issue.png">Encrypted Websocket Issue.png</a> por VaYshaleee — <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> · via Wikimedia Commons</figcaption>
</figure>

- **Imagem:** [Apollo Guidance Computer (AGC).jpg](https://commons.wikimedia.org/wiki/File%3AApollo_Guidance_Computer_%28AGC%29.jpg)
- **Autor(a):** Steve Jurvetson
- **Licença:** [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) · via Wikimedia Commons


<figure>
<img src="/covers/2026-09-09-websocket-do-zero-chat-em-tempo-real-com-node-js-e-react.jpg" alt="WebSocket do zero: chat em tempo real com Node.js e React" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>
