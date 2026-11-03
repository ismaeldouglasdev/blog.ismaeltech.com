---
title: "Docker é estranho, e por que isso importa para a sua stack"
date: "2026-10-24"
category: "tutorial"
tags: ["docker", "devops", "containers", "desenvolvimento"]
excerpt: "Se você já precisou orquestrar um ambiente de desenvolvimento com Docker, seja para um app full stack, uma API Python, ou uma base de dados, provavelmente sentiu aquela"
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-10-24-docker-e-estranho-e-por-que-isso-importa-para-a-sua-stack.jpg"
lang: "pt"
comments: true
translationKey: "2026-10-24-docker-e-estranho-e-por-que-isso-importa-para-a-sua-stack"
---

Se você já precisou orquestrar um ambiente de desenvolvimento com Docker, seja para um app full stack, uma API Python, ou uma base de dados, provavelmente sentiu aquela sensação estranha: a imagem compila perfeitamente no seu Mac, mas falha no Ubuntu do servidor. O CI/CD passa, mas o contêiner trava em produção com um erro enigmático de filesystem. O container parece vivo, mas o volume sumiu. Você faz um `docker build` e fica cinco minutos esperando enquanto todas as camadas são baixadas novamente, mesmo que você só tenha mudado uma linha de código.

É uma experiência quase universal: Docker é uma ferramenta incrível, mas também é estranha. Ela abstrai o sistema operacional, mas não esconde sua complexidade. Ela promete "funciona na minha máquina", mas às vezes só funciona na máquina de quem escreveu o Dockerfile. Se você já se perguntou por que um simples `COPY` pode levar segundos, por que o cache de build se perde do nada, ou por que o contêiner morre com `permission denied` em um volume, você não está sozinho.

A questão não é que Docker seja ruim. É que Docker é um sistema de emulação complexo, com camadas sobre camadas, e entender essa estranheza é o que separa um deploy doloroso de um fluxo de trabalho confiável. Em 2024, quando comecei a levar desenvolvimento full stack a sério, construindo APIs com FastAPI, frontends com React/Vite, e sistemas de sincronia como o inventory-service para conectar PDVs a marketplaces, aprendi essa lição na prática. Usar Docker só porque "todo mundo usa" sem entender seus mecanismos internos é pedir para perder horas debugando problemas de compatibilidade.

Eis o que torna Docker estranho, e por que essa estranheza importa para a sua stack.

## O que "Docker is weird" revela: camadas, cache e o comportamento do filesystem

O artigo clássico "Docker is weird" de Julia Evans põe o dedo na ferida: Docker tem um modelo mental que não é intuitivo. A principal fonte de estranheza vem do **sistema de camadas de imagem** e do **comportamento do union filesystem**.

Cada instrução em um Dockerfile cria uma nova camada. Quando você roda `docker build`, o Docker executa cada instrução, cria uma imagem intermediária dessa camada, e a armazena em cache. Isso é ótimo para velocidade, até você perceber que o cache é frágil.

```dockerfile
# Dockerfile exemplo
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

Aqui, a camada do `RUN npm ci` é cacheada se o `package.json` não mudar. Mas se você alterar um arquivo qualquer do projeto antes do `COPY . .`, o cache da linha `RUN npm run build` é invalidado, mesmo que o código-fonte da build não tenha mudado. A ordem importa, e muito.

A outra face da estranheza é o **filesystem efêmero**. Um contêiner, por padrão, não persiste dados. Quando ele é removido, tudo dentro dele some. É por isso que volumes e bind mounts existem, mas eles trazem seus próprios problemas de permissão e sincronia.

<figure>
<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Docker-linux-interfaces.svg/1920px-Docker-linux-interfaces.svg.png" alt="Diagrama de arquitetura do Docker mostrando interfaces com o kernel Linux" loading="lazy">
<figcaption>Arquitetura do Docker: múltiplas camadas de abstração sobre o kernel Linux. Imagem adaptada de Wikimedia Commons (CC BY-SA).</figcaption>
</figure>

Essa abstração vaza. No meu trabalho com o OSPOS (Open Source Point of Sale), que administro na Loja Quase Tudo, a migração de um banco de dados com cerca de 10 mil produtos entre sistemas exigiu containers para isolar versões do MySQL. A surpresa veio com a permissão de arquivos: os dumps SQL salvos dentro do contêiner desapareciam após o restart, e configurar volumes corretamente com o usuário e grupo adequados (`uid:gid`) foi um pequeno rito de passação.

## Como a estranheza do Docker afeta seu workflow full stack

Se você trabalha com uma stack moderna, React/TypeScript no frontend, Node.js ou Python no backend, PostgreSQL ou SQLite para dados, a estranheza do Docker aparece em pontos específicos.

**No desenvolvimento frontend**, especialmente com React e Vite, o problema é o hot reload e o desempenho. Montar o código-fonte via bind mount (`-v $(pwd):/app`) parece ideal, mas dentro do container, o Vite pode ter problemas para monitorar mudanças de arquivo devido a diferenças no inotify do Linux. A solução muitas vezes é adicionar `CHOKIDAR_USEPOLLING=true` ou flags específicas, quebrando a promessa de simplicidade.

**No backend com Python**, a gestão de dependências é um campo minado. Um `Dockerfile` que faz `COPY . .` antes de `RUN pip install` invalida o cache de instalação a cada mudança no código. O resultado é que cada rebuild instala novamente o `numpy` ou `pandas`, consumindo minutos preciosos. A ordem correta, copiar apenas `requirements.txt` primeiro, instalar, depois copiar o resto, é um conhecimento tribal.

**Com bancos de dados em containers**, a persistência é crucial. Um `docker-compose.yml` que define um serviço PostgreSQL sem um volume persistente é uma bomba-relógio. Quando você derrubar os containers para atualizar, todos os dados somem. E mesmo com volumes, restaurar backups ou migrar entre versões diferentes da imagem pode falhar silenciosamente se o filesystem interno do contêiner mudar entre tags.

```yaml
# docker-compose.yml problemático (sem volume persistente)
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: senha
    # Dados serão perdidos ao remover o container
```

Esses problemas se multiplicam em ambientes de produção. No projeto inventory-service, que sincroniza catálogo e estoque entre um PDV OSPOS e o Mercado Livre, a pipeline de CI/CD rodava em um runner Linux. As builds que funcionavam localmente no meu Arch Linux com Hyprland falhavam no runner porque a camada de cache era diferente e uma dependência nativa (`libssl`) tinha versões incompatíveis. A estranheza se tornou um bloqueio real.

## Soluções práticas: como domar a estranheza

Reconhecer que Docker é estranho é o primeiro passo. O segundo é adotar práticas que reduzam essa estranheza no dia a dia.

### 1. Otimize seus Dockerfiles para aproveitar o cache

A regra é simples: **coloque as instruções que mudam menos no topo**. Copie apenas os arquivos de dependência, instale-as, depois copie o restante do código.

```dockerfile
# Dockerfile otimizado para Python/Node
FROM python:3.12-slim

WORKDIR /app

# Copia apenas o arquivo de dependências primeiro
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Depois copia o resto do código
COPY . .

# Comando de execução
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
```

Para projetos Node.js, o mesmo princípio se aplica: copie `package.json` e `package-lock.json`, rode `npm ci` (que é mais determinístico que `npm install`), e só então copie o restante.

### 2. Use Docker Compose para orquestração local

Docker Compose não é apenas para produção. Ele padroniza o ambiente de desenvolvimento, define volumes, networks e variáveis de ambiente em um único arquivo. Isso reduz a "estranheza" de lembrar flags longas de `docker run`.

```yaml
# docker-compose.yml robusto para desenvolvimento full stack
services:
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/src:/app/src
    environment:
      CHOKIDAR_USEPOLLING: "true" # Para hot reload confiável
    command: npm run dev

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    env_file:
      - .env

  db:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data # Volume persistente
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}

volumes:
  postgres_data: # Volume nomeado, persiste entre restarts
```

### 3. Domine os volumes para persistência e desempenho

Volumes nomeados são seus amigos. Eles isolam os dados do ciclo de vida do contêiner. Para desenvolvimento, bind mounts são convenientes, mas atente às permissões. Se você está no Linux e o container roda como usuário `root`, arquivos criados dentro do container podem pertencer ao `root` no host, travando sua IDE.

Uma solução é forçar o container a rodar com o mesmo UID/GID do seu usuário host:

```dockerfile
# No Dockerfile do backend
ARG UID=1000
ARG GID=1000

RUN groupadd -g ${GID} appuser && \
    useradd -u ${UID} -g appuser -m appuser

USER appuser
```

### 4. Considere alternativas como Podman para desenvolvimento local

Podman é uma alternativa ao Docker que não requer um daemon rodando como root. Ele é compatível com Dockerfiles e docker-compose, mas com um modelo de segurança mais simples. Para desenvolvimento local, especialmente em Linux, Podman pode evitar aqueles problemas de permissão de socket e conflitos de daemon.

<figure>
<img src="https://raw.githubusercontent.com/containers/podman/main/docs/source/pictures/podman-logo.png" alt="Logo do Podman, uma alternativa ao Docker sem daemon" loading="lazy">
<figcaption>Podman oferece uma interface CLI compatível com Docker, mas sem a necessidade de um daemon rodando como root. Fonte: Repositório oficial do Podman (licença Apache 2.0).</figcaption>
</figure>

No meu ambiente de ricing com Arch Linux e Hyprland, testar containers com Podman eliminou a necessidade de gerenciar o serviço do Docker e deu mais controle sobre os containers como processos do usuário. Para projetos novos, vale a experimentação.

### 5. Use multi-stage builds para imagens finais enxutas

Multi-stage builds são uma das features mais poderosas para reduzir a estranheza de imagens gigantes. Você usa um container temporário para compilar e construir (com todas as ferramentas pesadas) e copia apenas os artefatos necessários para uma imagem final mínima.

```dockerfile
# Multi-stage build para uma aplicação React com Nginx
FROM node:20-alpine as builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

Isso resulta em uma imagem centenas de megabytes menor, mais segura (menos pacotes, menor superfície de ataque) e que sobe mais rápido em produção.

## Conclusão: entender a estranheza para evitar a dor

Docker não é mágica. É uma ferramenta complexa que abstrai complexidade, mas não a elimina. Sua estranheza, o sistema de camadas, o cache imprevisível, as permissões de volume, a diferença entre host e container, é inerente ao seu design.

Ignorar essa estranheza leva a deploy quebrado, horas de debug e frustração. Abraçá-la, entendendo como as camadas funcionam, como o cache se comporta e como os volumes persistem, transforma Docker de um obstáculo em uma alavanca poderosa.

Na minha trajetória, desde a administração de infraestrutura Linux no PDV da loja até os projetos open source como o Engram, onde contribuí com dezenas de PRs envolvendo segurança de containers e tooling CLI, a lição sempre foi a mesma: as ferramentas mais poderosas exigem que você entenda seus mecanismos, não apenas sua interface.

Se você está começando com containers, gaste tempo lendo a documentação oficial, experimentando com Dockerfiles pequenos, e observando o comportamento das camadas com `docker history`. Se já está há tempos na estrada, revisite suas práticas: seus Dockerfiles estão otimizados? Seus volumes são persistentes? Sua CI/CD leva em conta a estranheza do cache entre runners?

No fim, Docker é estranho, mas é uma estranheza que você pode dominar. E quando domina, ela para de atrapalhar e começa a ajudar.

### Takeaways práticos

- **O cache do Docker é baseado em camadas**: alterar uma linha de código antes da instalação de dependências quebra o cache. Coloque `COPY` de dependências primeiro, instale, depois copie o código.
- **Use volumes nomeados para persistência de dados críticos**, como bancos de dados. Bind mounts são ótimos para desenvolvimento, mas atente às permissões de usuário.
- **Docker Compose padroniza ambientes** e reduz erros de configuração manual. Use um arquivo `docker-compose.yml` mesmo para desenvolvimento local.
- **Multi-stage builds produzem imagens finais menores e mais seguras**. Use um stage para build e outro, mínimo, para runtime.
- **Considere Podman para desenvolvimento local** se problemas de permissão de daemon root forem frequentes no seu fluxo.
- **A estranheza é gerenciável** com entendimento. Use `docker inspect`, `docker history` e experimente em projetos pequenos antes de escalar.

## Fontes

- [Documentação oficial do Docker: Best practices for writing Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Julia Evans - Docker is weird](https://jvns.ca/blog/2016/10/14/docker-is-weird/) (artigo clássico que inspirou este post)
- [Podman: A tool for managing OCI containers and pods](https://podman.io/docs)
- [Docker Compose specification](https://docs.docker.com/compose/compose-file/)
- [PostgreSQL Docker image official documentation](https://hub.docker.com/_/postgres)
- [React + Docker: Development with Hot Reload](https://github.com/facebook/create-react-app/issues/8688) (discussão sobre configuração de hot reload)