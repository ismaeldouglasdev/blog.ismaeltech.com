---
title: "Docker Is Weird, And Why That Matters for Your Tech Stack"
date: "2026-10-24"
category: "tutorial"
tags: ["docker", "devops", "containers", "desenvolvimento"]
excerpt: "If youve ever needed to orchestrate a development environment with Docker, whether for a full stack app, a Python API, or a database, youve probably felt that strange"
cover:
  image: "/covers/2026-10-24-docker-e-estranho-e-por-que-isso-importa-para-a-sua-stack.jpg"
comments: true
translationKey: "2026-10-24-docker-e-estranho-e-por-que-isso-importa-para-a-sua-stack"
---
If you've ever needed to orchestrate a development environment with Docker, whether for a full stack app, a Python API, or a database, you've probably felt that strange sensation: the image builds perfectly on your Mac, but fails on the Ubuntu server. CI/CD passes, but the container crashes in production with an enigmatic filesystem error. The container seems alive, but the volume vanished. You run `docker build` and wait five minutes while all layers are downloaded again, even though you only changed one line of code.

It's an almost universal experience: Docker is an incredible tool, but it's also a strange one. It abstracts the operating system but doesn't hide its complexity. It promises "it works on my machine," but sometimes it only works on the machine of the person who wrote the Dockerfile. If you've ever wondered why a simple `COPY` can take seconds, why the build cache gets lost for no reason, or why the container dies with `permission denied` on a volume, you are not alone.

The issue isn't that Docker is bad. It's that Docker is a complex emulation system, with layers upon layers, and understanding this strangeness is what separates a painful deployment from a reliable workflow. In 2024, when I started taking full stack development seriously, building APIs with FastAPI, frontends with React/Vite, and synchronization systems like inventory-service to connect POS systems to marketplaces, I learned this lesson the hard way. Using Docker just because "everyone uses it" without understanding its internal mechanisms is asking to waste hours debugging compatibility issues.

Here is what makes Docker strange, and why this strangeness matters for your stack.

## What "Docker is weird" reveals: layers, cache, and filesystem behavior

The classic article "Docker is weird" by Julia Evans hits a nerve: Docker has a mental model that isn't intuitive. The main source of strangeness comes from the **image layer system** and the **union filesystem behavior**.

Each instruction in a Dockerfile creates a new layer. When you run `docker build`, Docker executes each instruction, creates an intermediate image for that layer, and stores it in cache. This is great for speed, until you realize the cache is fragile.

```dockerfile
# Example Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

Here, the `RUN npm ci` layer is cached if `package.json` doesn't change. But if you change any project file before the `COPY . .`, the cache for the `RUN npm run build` line is invalidated, even if the build source code hasn't changed. Order matters, a lot.

The other side of the weirdness is the **ephemeral filesystem**. A container, by default, does not persist data. When it's removed, everything inside it disappears. That's why volumes and bind mounts exist, but they bring their own problems with permissions and synchronization.

<figure>
<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Docker-linux-interfaces.svg/1920px-Docker-linux-interfaces.svg.png" alt="Diagram of Docker architecture showing interfaces with the Linux kernel" loading="lazy">
<figcaption>Docker architecture: multiple layers of abstraction over the Linux kernel. Image adapted from Wikimedia Commons (CC BY-SA).</figcaption>
</figure>

This abstraction leaks. In my work with OSPOS (Open Source Point of Sale), which I manage at Loja Quase Tudo, migrating a database with about 10,000 products between systems required containers to isolate MySQL versions. The surprise came with file permissions: SQL dumps saved inside the container vanished after a restart, and correctly setting up volumes with the appropriate user and group (`uid:gid`) was a small rite of passage.

## How Docker's Weirdness Affects Your Full-Stack Workflow

If you work with a modern stack, React/TypeScript on the frontend, Node.js or Python on the backend, PostgreSQL or SQLite for data, Docker's weirdness shows up at specific points.

**In frontend development**, especially with React and Vite, the problem is hot reload and performance. Mounting the source code via a bind mount (`-v $(pwd):/app`) seems ideal, but inside the container, Vite can have problems watching for file changes due to differences in Linux's inotify. The solution is often to add `CHOKIDAR_USEPOLLING=true` or specific flags, breaking the promise of simplicity.

**In the Python backend**, dependency management is a minefield. A `Dockerfile` that does `COPY . .` before `RUN pip install` invalidates the installation cache with every code change. The result is that every rebuild reinstalls `numpy` or `pandas`, consuming precious minutes. The correct order, copying only `requirements.txt` first, installing, then copying the rest, is tribal knowledge.

**With databases in containers**, persistence is crucial. A `docker-compose.yml` that defines a PostgreSQL service without a persistent volume is a ticking time bomb. When you bring the containers down to update, all your data disappears. And even with volumes, restoring backups or migrating between different versions of the image can fail silently if the container's internal filesystem changes between tags.

```yaml
# Problematic docker-compose.yml (no persistent volume)
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: senha
    # Data will be lost when removing the container
```

These problems multiply in production environments. In the inventory-service project, which synchronizes catalog and inventory between an OSPOS POS system and Mercado Livre, the CI/CD pipeline ran on a Linux runner. Builds that worked locally on my Arch Linux with Hyprland failed on the runner because the cache layer was different and a native dependency (`libssl`) had incompatible versions. The weirdness became a real blocker.

## Practical Solutions: How to Tame the Weirdness

Recognizing that Docker is weird is the first step. The second is adopting practices that reduce this weirdness in day‑to‑day work.

### 1. Optimize your Dockerfiles to leverage the cache

The rule is simple: **put the instructions that change least at the top**. Copy only the dependency files, install them, then copy the rest of the code.

```dockerfile
# Dockerfile optimized for Python/Node
FROM python:3.12-slim

WORKDIR /app

# Copy only the dependency file first
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Then copy the rest of the code
COPY . .

# Execution command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
```

For Node.js projects, the same principle applies: copy `package.json` and `package‑lock.json`, run `npm ci` (which is more deterministic than `npm install`), and only then copy the remainder.

### 2. Use Docker Compose for local orchestration

Docker Compose isn’t just for production. It standardizes the development environment, defining volumes, networks, and environment variables in a single file. This reduces the “weirdness” of remembering long `docker run` flags.

```yaml
# Robust docker-compose.yml for full‑stack development
services:
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/src:/app/src
    environment:
      CHOKIDAR_USEPOLLING: "true" # For reliable hot reload
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
      - postgres_data:/var/lib/postgresql/data # Persistent volume
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}

volumes:
  postgres_data: # Named volume, persists across restarts
```

### 3. Master volumes for persistence and performance

Named volumes are your friends. They isolate data from the container lifecycle. For development, bind mounts are convenient, but watch out for permissions. If you’re on Linux and the container runs as the `root` user, files created inside the container may belong to `root` on the host, locking you out of your IDE.

One solution is to force the container to run with the same UID/GID as your host user:

```dockerfile
# In the backend Dockerfile
ARG UID=1000
ARG GID=1000
```

RUN groupadd -g ${GID} appuser && \
    useradd -u ${UID} -g appuser -m appuser

USER appuser
```

### 4. Consider alternatives like Podman for local development

Podman is an alternative to Docker that does not require a daemon running as root. It is compatible with Dockerfiles and docker-compose, but with a simpler security model. For local development, especially on Linux, Podman can avoid those socket permission issues and daemon conflicts.

<figure>
<img src="https://raw.githubusercontent.com/containers/podman/main/docs/source/pictures/podman-logo.png" alt="Logo of Podman, a daemonless Docker alternative" loading="lazy">
<figcaption>Podman provides a Docker‑compatible CLI interface, but without the need for a root‑running daemon. Source: Official Podman repository (Apache 2.0 license).</figcaption>
</figure>

In my ricing environment with Arch Linux and Hyprland, testing containers with Podman eliminated the need to manage the Docker service and gave me more control over containers as user processes. For new projects, it’s worth experimenting with.

### 5. Use multi‑stage builds for lean final images

Multi‑stage builds are one of the most powerful features for reducing the bloat of huge images. You use a temporary container to compile and build (with all the heavy tools) and copy only the necessary artifacts into a minimal final image.

```dockerfile
# Multi‑stage build for a React app with Nginx
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

This results in an image that is hundreds of megabytes smaller, more secure (fewer packages, smaller attack surface), and starts faster in production.

## Conclusion: Understanding the Strangeness to Avoid the Pain

Docker is not magic. It's a complex tool that abstracts complexity but doesn't eliminate it. Its strangeness, the layer system, the unpredictable cache, volume permissions, the difference between host and container, is inherent to its design.

Ignoring this strangeness leads to broken deployments, hours of debugging, and frustration. Embracing it, by understanding how layers work, how the cache behaves, and how volumes persist, transforms Docker from an obstacle into a powerful lever.

In my journey, from administering Linux infrastructure at a point-of-sale system to open-source projects like Engram, where I contributed dozens of PRs involving container security and CLI tooling, the lesson has always been the same: the most powerful tools require you to understand their mechanisms, not just their interface.

If you're starting with containers, spend time reading the official documentation, experimenting with small Dockerfiles, and observing layer behavior with `docker history`. If you've been on the road for a while, revisit your practices: are your Dockerfiles optimized? Are your volumes persistent? Does your CI/CD account for the strangeness of cache across runners?

In the end, Docker is strange, but it's a strangeness you can master. And when you master it, it stops getting in the way and starts helping.

### Practical Takeaways

- **Docker cache is based on layers**: Changing a line of code before installing dependencies breaks the cache. Place `COPY` for dependencies first, install them, then copy the code.
- **Use named volumes for critical data persistence**, like databases. Bind mounts are great for development, but pay attention to user permissions.
- **Docker Compose standardizes environments** and reduces manual configuration errors. Use a `docker-compose.yml` file even for local development.
- **Multi-stage builds produce smaller, more secure final images**. Use one stage for build and another, minimal one, for runtime.
- **Consider Podman for local development** if root daemon permission issues are frequent in your workflow.
- **The strangeness is manageable** with understanding. Use `docker inspect`, `docker history` and experiment on small projects before scaling.

## Sources

- [Official Docker Documentation: Best practices for writing Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Julia Evans - Docker is weird](https://jvns.ca/blog/2016/10/14/docker-is-weird/) (classic article that inspired this post)
- [Podman: A tool for managing OCI containers and pods](https://podman.io/docs)
- [Docker Compose specification](https://docs.docker.com/compose/compose-file/)
- [PostgreSQL Docker image official documentation](https://hub.docker.com/_/postgres)
- [React + Docker: Development with Hot Reload](https://github.com/facebook/create-react-app/issues/8688) (discussion about hot reload configuration)