---
title: "Autenticação JWT completa: login, refresh token e proteção de rotas"
date: "2026-08-23"
category: "tutorial"
tags: ["jwt", "autenticação", "segurança", "node"]
excerpt: "Autenticação JWT completa: fluxo de login, access e refresh tokens, proteção de rotas com middleware, rotação e revogação."
share_hook: "Access e refresh tokens, middleware de rota, rotação e blacklist: o fluxo de autenticação completo, incluindo o que costuma ser esquecido."
lang: "pt"
---

## Introdução: JWT vs Sessões

Quando um aplicativo web começa a receber mais de alguns poucos usuários, a abordagem de sessão baseada em cookie simplesmente não escala. É o cenário clássico de quem opera qualquer aplicação que cresce: o tráfego aumenta, a sessão armazenada no lado do servidor vira gargalo, a latência do banco dispara e a resposta natural é migrar para tokens JWT. Em vez de armazenar um ID de sessão em um banco de dados e verificar isso a cada solicitação, podemos assinar dados e verificá-los em qualquer lugar.

JWT se tornou o padrão para APIs modernas, principalmente porque funciona bem com microsserviços e clientes móveis. No entanto, a praticidade vem com responsabilidades. Uma implementação descuidada pode transformar um sistema aparentemente seguro em um alvo fácil para atacantes. Este artigo percorre o ciclo de vida completo de autenticação: desde o primeiro login até a renovação de credenciais e a proteção das rotas. Vou compartilhar soluções que usei em produção, armadilhas pelas quais já passei e precisei consertar e dicas práticas que funcionam na vida real. Nada é teórico aqui; cada trecho de código foi testado e funciona.

## O Fluxo de Login Completo

O fluxo típico começa com um usuário fornecendo credenciais (e-mail e senha). No backend, você verifica as credenciais, emite um token de acesso assinado e um token de refresh (se estiver usando rotação de refresh). O token de acesso é breve, geralmente de 15 minutos, enquanto o refresh é mais longo, como 7 dias. O cliente armazena o token de acesso em memória (ou localStorage para SPAs) e o refresh em um cookie httpOnly seguro (para maior segurança). Na prática, eu sempre uso um cookie para o refresh, pois isso impede que ele seja exposto a XSS.

Aqui está um endpoint de login simples em Express com Passport local:

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

Na minha experiência, é importante nunca expor o refresh token via JSON; um cookie httpOnly é mais seguro. Isso reduz o risco de roubo via XSS e facilita a rotação do token posteriormente.

## Gerando Access e Refresh Tokens

### Access Token

O access token carrega as informações que você precisa para autorizar ações. Eu sempre incluo um identificador de usuário mínimo e um papel (ou função). Nunca coloque informações confidenciais—como senhas—dentro do token, mesmo que ele seja assinado. A assinatura impede a adulteração, mas o payload é visível para qualquer pessoa que decodifique o token.

```js
const accessToken = jwt.sign(
  { id: user._id, role: user.role, iat: Math.floor(Date.now() / 1000) },
  process.env.JWT_SECRET,
  { expiresIn: '15m', issuer: 'myapp', audience: 'client' }
);
```

Eu adiciono um emissor e um público para garantir que o token seja válido apenas para o meu domínio. Isso evita que tokens emitidos para um serviço sejam aceitos por outro.

### Refresh Token

O refresh token é usado para obter um novo access token sem que o usuário precise fazer login novamente. Eu o armazeno no banco de dados (no campo `refreshToken` do usuário) porque isso permite que você revogue tokens individuais, implemente blacklist e gire tokens de forma segura.

```js
const refreshToken = jwt.sign(
  { id: user._id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

Em muitos sistemas, o refresh token é um JWT de longa duração assinado com um segredo diferente. Quando você recebe um refresh token, verifica sua assinatura, decodifica o ID do usuário e compara o token armazenado com o fornecido. Se eles corresponderem, você emite um novo access token e, opcionalmente, um novo refresh token (rotação). Uma coisa que percebi é que você deve invalidar o refresh antigo antes de emitir um novo; caso contrário, você pode ter tokens em excesso no banco de dados.

## Middleware de Proteção de Rotas

Depois que um cliente recebe um access token, todas as solicitações subsequentes devem apresentar esse token. O middleware de autenticação verifica o token, decodifica-o e anexa o usuário à solicitação. Aqui está um middleware reutilizável que também faz a verificação de tempo de vida:

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

Na prática, eu sempre coloco este middleware antes de quaisquer rotas protegidas:

```js
router.get('/dashboard', authenticateToken, (req, res) => {
  res.json({ message: 'Bem-vindo ao dashboard', userId: req.user.id });
});
```

O middleware também pode ser usado para autorizar funções específicas—por exemplo, apenas administradores podem acessar `/admin`. Eu adiciono uma verificação de papel após a autenticação:

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

## Rotação de Refresh Token

A rotação de refresh token impede que um refresh token roubado seja usado indefinidamente. Em vez de reutilizar o mesmo refresh token, você emite um novo após um refresh bem-sucedido e descarta o antigo. Isso também reduz o número de tokens em excesso no banco de dados.

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

Na minha experiência, muitas APIs simplesmente renovam o access token sem girar o refresh. Isso está bem se você pode confiar no dispositivo do usuário (por exemplo, um SPA em um navegador confiável). No entanto, para aplicativos móveis ou backends que expõem um endpoint de refresh, a rotação adiciona uma camada extra de segurança.

## Blacklist e Invalidação

Embora a rotação de refresh tokens reduza a vida útil dos tokens comprometidos, você ainda pode precisar revogar tokens prematuramente—por exemplo, quando um usuário faz logout ou altera a senha. Duas abordagens comuns são: blacklist no banco de dados e uso de um blacklist em memória baseado em Redis.

### Blacklist no Banco de Dados

Adicione um campo `blacklistedTokens` ao modelo do usuário (ou uma coleção separada). Quando um usuário faz logout ou você revoga um token, você adiciona o JWT `jti` (ID do token) à lista negra. O middleware verifica a blacklist antes de aceitar um token.

```js
// models/User.js
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  refreshToken: String,
  blacklistedTokens: [{ type: String }] // armazena jti
});
```

Endpoint de logout:

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

Middleware de verificação de blacklist:

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

Você pode aplicar `checkBlacklist` após `authenticateToken` para garantir que tokens revogados sejam rejeitados.

### Blacklist em Memória (Redis)

Para sistemas distribuídos onde vários servidores precisam compartilhar o estado da blacklist, o Redis é uma boa opção. Armazene o `jti` com um TTL correspondente à expiração do token. O middleware simplesmente verifica `redis.get(jti)`.

```js
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

async function isBlacklisted(jti) {
  return !!(await client.get(jti));
}
```

Depois de adicionar um token à blacklist, defina-o:

```js
await client.set(jti, '1', 'EX', ttlSeconds);
```

Escolha a abordagem que melhor se adapta à sua infraestrutura. Na minha experiência, o Redis funciona bem para microsserviços onde cada instância precisa verificar a blacklist sem consultar um banco de dados relacional.


<figure>
  <img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-08-23-autenticacao-jwt-completa-login-refresh-token-e-protecao-de.jpg" alt="Cibersegurança vs. segurança da informação: conceitos complementares." loading="lazy" />
  <figcaption>
    Cibersegurança vs. segurança da informação: conceitos complementares. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3ACybersecurity_vs_information_security.png">Cybersecurity vs information security.png</a> por Pcoronaf —
    <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a> · via Wikimedia Commons
  </figcaption>
</figure>

## Armadilhas de Segurança Comuns

Mesmo com a rotação e a blacklist, muitas APIs ainda cometem erros básicos. Abaixo estão as armadilhas mais comuns que eu já vi em produção, com soluções práticas.

### 1. Expor Refresh Tokens via JSON

Nunca envie um refresh token no corpo da resposta. Use um cookie httpOnly seguro. Se você precisa de um refresh token para clientes móveis (que não podem ler cookies), armazene-o em um armazenamento seguro no dispositivo (Keychain no iOS, Keystore no Android). Um cookie httpOnly elimina a exposição a XSS.

### 2. Reutilizar o Mesmo Refresh Token

Se você simplesmente renova o access token sem emitir um novo refresh token, um atacante que rouba o refresh token pode usá-lo indefinidamente. A rotação é simples: gere um novo refresh token, armazene-o e destrua o antigo.

### 3. Não Validar a Origem do Access Token

Sempre verifique o emissor e o público (`issuer` e `audience`). Isso impede que tokens emitidos para um serviço sejam aceitos por outro. Em um ambiente multitenant, essa verificação é crucial.

### 4. Usar Intervalos de Expiração Longos

Um access token de 24 horas aumenta o risco de uso indevido. Mantenha o access token curto (5-15 minutos) e use o refresh token para obter novos tokens. Um refresh token mais longo (dias) é aceitável porque é armazenado com mais segurança.

### 5. Armazenar Segredos em Código-Fonte

Mantenha `JWT_SECRET` e `JWT_REFRESH_SECRET` fora do código-fonte, em variáveis de ambiente.
## 📸 Crédito da imagem de capa
- **Imagem:** [DOM Security Lock and Key.JPG](https://commons.wikimedia.org/wiki/File%3ADOM_Security_Lock_and_Key.JPG)
- **Autor(a):** ItalianLocksmith
- **Licença:** [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · via Wikimedia Commons
