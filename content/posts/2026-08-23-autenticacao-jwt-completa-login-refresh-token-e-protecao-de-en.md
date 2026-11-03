---
title: "Full JWT Authentication: Login, Refresh Tokens, and Route Protection"
date: "2026-08-23"
category: "tutorial"
tags: ["jwt", "autenticacao", "seguranca", "node"]
excerpt: "Complete JWT authentication: login flow, access and refresh tokens, route protection with middleware, rotation, and revocation."
share_hook: "Access and refresh tokens, route middleware, rotation and blacklist - the full flow."
lang: "en"
comments: true
translation_of: "2026-08-23-autenticacao-jwt-completa-login-refresh-token-e-protecao-de"
---



## Introduction: JWT vs Sessions

When a web application starts getting more than a few users, the cookie‑based session approach simply doesn't scale. It's the classic scenario for anyone running an application that grows: traffic goes up, the server‑side session store becomes a bottleneck, database latency spikes, and the natural response is to migrate to JWT tokens. Instead of storing a session ID in a database and checking it on every request, we can sign data and verify it anywhere.

JWT has become the standard for modern APIs, mainly because it works well with microservices and mobile clients. However, convenience comes with responsibilities. A careless implementation can turn an apparently secure system into an easy target for attackers. This article walks through the full authentication lifecycle: from the first login to credential renewal and route protection. I'll share solutions I've used in production, pitfalls I've had to fix, and practical tips that work in the real world. Nothing here is theoretical; every code snippet has been tested and works.

## The Complete Login Flow

The typical flow starts with a user providing credentials (email and password). In the backend, you verify the credentials, issue a signed access token and a refresh token (if you’re using refresh rotation). The access token is short‑lived, usually about 15 minutes, while the refresh token lasts longer, such as 7 days. The client stores the access token in memory (or localStorage for SPAs) and the refresh token in a secure httpOnly cookie (for added security). In practice, I always use a cookie for the refresh token because it prevents it from being exposed to XSS.

Here is a simple login endpoint in Express with local Passport:

```js
// routes/auth.js
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Encontre o usuário no banco de dados
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Compare a senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Gere tokens
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Armazene o refresh token no banco de dados (opcional, para blacklist)
    user.refreshToken = refreshToken;
    await user.save();

    // Envie o refresh em um cookie httpOnly seguro
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // apenas HTTPS
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Envie o access token no corpo (ou cookie se preferir)
    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});
```

In my experience, you should never expose the refresh token via JSON; an httpOnly cookie is safer. This reduces the risk of theft via XSS and makes token rotation easier later.

## Generating Access and Refresh Tokens

### Access Token

The access token carries the information you need to authorize actions. I always include a minimal user identifier and a role (or function). Never put confidential information—like a password—inside the token, even if it is signed. The signature prevents tampering, but the payload is visible to anyone who decodes the token.

```js
const accessToken = jwt.sign(
  { id: user._id, role: user.role, iat: Math.floor(Date.now() / 1000) },
  process.env.JWT_SECRET,
  { expiresIn: '15m', issuer: 'myapp', audience: 'client' }
);
```

I add an issuer and an audience to ensure the token is valid only for my domain. This prevents tokens issued for one service from being accepted by another.

### Refresh Token

The refresh token is used to obtain a new access token without requiring the user to log in again. I store it in the database (in the user's `refreshToken` field) because this allows you to revoke individual tokens, implement a blacklist, and rotate tokens securely.

```js
const refreshToken = jwt.sign(
  { id: user._id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

In many systems, the refresh token is a long‑lived JWT signed with a different secret. When you receive a refresh token, you verify its signature, decode the user ID, and compare the stored token with the one provided. If they match, you issue a new access token and, optionally, a new refresh token (rotation). One thing I've noticed is that you should invalidate the old refresh token before issuing a new one; otherwise, you can end up with excess tokens in the database.

## Route Protection Middleware

After a client receives an access token, all subsequent requests must present that token. The authentication middleware checks the token, decodes it, and attaches the user to the request. Here is a reusable middleware that also performs lifetime verification:

```js
// middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: 'Token de acesso ausente' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'myapp',
      audience: 'client'
    });

    // Anexa o usuário à solicitação
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    // Erros específicos: TokenExpiredError, JsonWebTokenError
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    return res.status(403).json({ message: 'Token inválido' });
  }
}
```

In practice, I always place this middleware before any protected routes:

```js
router.get('/dashboard', authenticateToken, (req, res) => {
  res.json({ message: 'Bem-vindo ao dashboard', userId: req.user.id });
});
```

The middleware can also be used to authorize specific roles—e.g., only administrators can access `/admin`. I add a role check after authentication:

```js
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    next();
  };
}
```

## Refresh Token Rotation

Refresh token rotation prevents a stolen refresh token from being used indefinitely. Instead of reusing the same refresh token, you issue a new one after a successful refresh and discard the old one. This also reduces the number of excess tokens in the database.

```js
// routes/token.js
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token ausente' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Refresh token inválido' });
    }

    // Gere novos tokens
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Substitua o refresh token antigo
    user.refreshToken = newRefreshToken;
    await user.save();

    // Envie o novo refresh token em um cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(403).json({ message: 'Refresh token inválido' });
  }
});
```

In my experience, many APIs simply renew the access token without rotating the refresh token. This is fine if you can trust the user's device (e.g., an SPA in a trusted browser). However, for mobile apps or backends that expose a refresh endpoint, rotation adds an extra layer of security.

## Blacklist and Invalidation

Although refresh‑token rotation reduces the lifespan of compromised tokens, you may still need to revoke tokens prematurely—e.g., when a user logs out or changes their password. Two common approaches are: a database blacklist and an in‑memory blacklist based on Redis.

### Database Blacklist

Add a `blacklistedTokens` field to the user model (or a separate collection). When a user logs out or you revoke a token, you add the JWT `jti` (token ID) to the blacklist. The middleware checks the blacklist before accepting a token.

```js
// models/User.js
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  refreshToken: String,
  blacklistedTokens: [{ type: String }] // armazena jti
});
```

Logout endpoint:

```js
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    const decoded = jwt.decode(token); // decodifica sem verificar assinatura
    const jti = decoded?.jti;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Adicione o jti à lista negra
    if (jti) {
      user.blacklistedTokens.push(jti);
    }

    // Limpe o refresh token
    user.refreshToken = undefined;
    await user.save();

    res.json({ message: 'Logout realizado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no logout' });
  }
});
```

Blacklist verification middleware:

```js
async function checkBlacklist(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return next();

  const decoded = jwt.decode(token);
  if (!decoded || !decoded.jti) return next();

  const user = await User.findOne({ 'blacklistedTokens': decoded.jti });
  if (user) {
    return res.status(401).json({ message: 'Token revogado' });
  }

  next();
}
```

You can apply `checkBlacklist` after `authenticateToken` to ensure revoked tokens are rejected.

### In‑Memory Blacklist (Redis)

---  
For distributed systems where multiple servers need to share the blacklist state, Redis is a good option. Store the `jti` with a TTL corresponding to the token’s expiration. The middleware simply checks `redis.get(jti)`.  
---

```js
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

async function isBlacklisted(jti) {
  return !!(await client.get(jti));
}
```

After adding a token to the blacklist, set it:

```js
await client.set(jti, '1', 'EX', ttlSeconds);
```

Choose the approach that best fits your infrastructure. In my experience, Redis works well for microservices where each instance needs to check the blacklist without querying a relational database.


<figure>
  <img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-08-23-autenticacao-jwt-completa-login-refresh-token-e-protecao-de.jpg" alt="Cybersecurity vs. information security: complementary concepts." loading="lazy" />
  <figcaption>
    Cybersecurity vs. information security: complementary concepts. — Image: <a href="https://commons.wikimedia.org/wiki/File%3ACybersecurity_vs_information_security.png">Cybersecurity vs information security.png</a> by Pcoronaf —
    <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a> · via Wikimedia Commons
  </figcaption>
</figure>

## Common Security Pitfalls

Even with rotation and blacklist, many APIs still make basic mistakes. Below are the most common pitfalls I've seen in production, with practical solutions.

### 1. Exposing Refresh Tokens via JSON

Never send a refresh token in the response body. Use a secure httpOnly cookie. If you need a refresh token for mobile clients (which can't read cookies), store it in a secure storage on the device (Keychain on iOS, Keystore on Android). An httpOnly cookie eliminates exposure to XSS.

### 2. Reusing the Same Refresh Token

If you simply renew the access token without issuing a new refresh token, an attacker who steals the refresh token can use it indefinitely. Rotation is simple: generate a new refresh token, store it, and destroy the old one.

### 3. Not Validating the Origin of the Access Token

Always verify the issuer and audience (`issuer` and `audience`). This prevents tokens issued for one service from being accepted by another. In a multitenant environment, this check is crucial.

### 4. Using Long Expiration Intervals

A 24‑hour access token increases the risk of misuse. Keep the access token short (5‑15 minutes) and use the refresh token to obtain new tokens. A longer refresh token (days) is acceptable because it is stored more securely.

### 5. Storing Secrets in Source Code

Keep `JWT_SECRET` and `JWT_REFRESH_SECRET` in environment variables, never in the source code.
## 📸 Cover image credit
- **Image:** [DOM Security Lock and Key.JPG](https://commons.wikimedia.org/wiki/File%3ADOM_Security_Lock_and_Key.JPG)
- **Author:** ItalianLocksmith
- **License:** [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · via Wikimedia Commons
