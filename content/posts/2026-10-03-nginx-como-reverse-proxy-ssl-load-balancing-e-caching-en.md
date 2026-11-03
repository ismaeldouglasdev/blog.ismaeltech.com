---
title: "Nginx as a Reverse Proxy: SSL, Load Balancing, and Caching"
date: "2026-10-03"
category: "tutorial"
tags: ["nginx", "devops", "proxy"]
excerpt: "Deploying a web app directly exposing the Node.js, Python, or Go port to the public internet is asking for trouble."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-10-03-nginx-como-reverse-proxy-ssl-load-balancing-e-caching.jpg"
lang: "en"
comments: true
translation_of: "2026-10-03-nginx-como-reverse-proxy-ssl-load-balancing-e-caching"
---

Putting a web application in production by directly exposing the Node.js, Python, or Go port to the public internet is asking for trouble. Application servers are excellent for processing business rules, handling asynchronous I/O, and responding to dynamic requests. However, they were rarely designed to efficiently handle the heavy burden of TLS negotiation, slow network attacks, buffering of massive uploads, or serving static files.

This is where Nginx enters as a game-changer. Created in the early 2000s by Igor Sysoev to solve the famous C10k problem (sustaining ten thousand simultaneous connections on a single machine), Nginx uses an event-driven asynchronous architecture. Instead of spawning a heavy thread for each TCP connection, it processes thousands of clients with minimal memory consumption.

Configuring Nginx as a reverse proxy transforms the architecture of any application. It works as a shielding and performance layer: it handles SSL termination, distributes load across instances, applies response caching, and protects the backend from request abuse.

```markdown
## Basic Anatomy of a Reverse Proxy

For those managing Linux servers, the first hurdle with Nginx is often the configuration file structure. The main file is typically located at `/etc/nginx/nginx.conf`, but best practice for maintaining multiple services organizes the blocks in `/etc/nginx/sites-available/` and creates symbolic links in `/etc/nginx/sites-enabled/`.

The central directive that turns Nginx into a reverse proxy is `proxy_pass`. It instructs the web server to take the request received on port 80 or 443 and forward it to an internal service listening on another port or a local UNIX socket.

```nginx
# /etc/nginx/sites-available/myapp.conf

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

The block above does much more than just forward traffic. By configuring `proxy_set_header`, we ensure that the backend application knows who actually made the request.

If you do not pass `X-Real-IP` and `X-Forwarded-For`, all logs from your Node.js or FastAPI framework will register `127.0.0.1` as the source of all traffic. This makes security analysis, auditing, or IP blocking at the application level unfeasible.

The `Upgrade` and `Connection` directives ensure immediate compatibility with WebSockets. If your application maintains persistent real-time connections, without these headers, Nginx will cut the handshake and drop the communication.
```

## Securing Connections with SSL and Let's Encrypt

Deploying a service without encryption is no longer viable today. Beyond the fundamental privacy concerns, modern browsers penalize unencrypted HTTP connections, and APIs typically block insecure requests by default.

Combining Nginx with Certbot from the Electronic Frontier Foundation (EFF) makes issuing and renewing Let's Encrypt SSL/TLS certificates nearly automatic on Linux.

To install Certbot on Ubuntu, Debian, or Arch Linux-based distributions, simply use the default package manager and enable Nginx's dedicated plugin:

```bash
# Installation and automatic issuance
sudo certbot --nginx -d api.example.com
```

Certbot reads the existing Nginx configuration, validates the ACME challenge against the public domain, downloads the certificates, and automatically updates the configuration file.

However, understanding the underlying process helps avoid surprises when customizing ciphers or implementing stricter security headers. A robust SSL configuration in Nginx should resemble the following:

```nginx
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    # Secure protocols and modern ciphers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

    # TLS session optimization
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # Transport security
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

The first block listens on port 80 and redirects all requests to HTTPS using a permanent 301 redirect.

In the main block, we enable `http2` for connection multiplexing over a single TCP session, reducing loading latency. The `ssl_session_cache` parameter stores TLS negotiation data in Nginx's RAM, preventing recurring clients from having to redo the entire cryptographic handshake with each request.

## Traffic Distribution with Load Balancing

When the application grows or when we need to run parallel processes with tools like PM2 or Docker containers, keeping only one backend instance creates a single point of failure and CPU bottleneck.

Nginx solves this natively through the `upstream` block. It allows defining a pool of servers and distributing incoming requests among them.

```nginx
upstream node_backend {
    # Default algorithm: Round Robin
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003 max_fails=3 fail_timeout=30s;
    
    # Backup server
    server 127.0.0.1:3004 backup;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # ... SSL certificates ...

    location / {
        proxy_pass http://node_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Keep connections alive with the backend
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

In this configuration, Nginx uses Round Robin by default, sending the first request to port 3001, the second to port 3002, and the third to port 3003. If port 3003 fails three times in a row within 30 seconds, it is temporarily removed from the queue. The server on port 3004 will only receive traffic if all other three are down.

There are other distribution methods depending on your load profile:

- `least_conn`: sends the request to the server with the fewest active connections at the moment. Ideal for routes that run slow and uneven processing.
- `ip_hash`: ensures that requests from the same IP address always fall on the same backend instance. Useful when the application still depends on local in-memory sessions.

To maintain high efficiency in the upstream, it is recommended to configure the `keepalive` block inside the `upstream`, allowing Nginx to reuse open TCP connections directly with Node.js or Python applications.

## Caching Assets and Responses in the Proxy

Having the backend respond to identical requests for static data or heavy database queries is a clear waste of resources. Nginx can act as a reverse cache on disk or shared memory, responding before even bothering Node.js.

Configuring cache involves two steps: declaring the memory zone in the `http` context and applying the rule inside the `location` block.

```nginx
# Outside the server block, in the http context
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=API_CACHE:10m max_size=1g inactive=60m use_temp_path=off;

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # ... SSL certificates ...

    location /static/ {
        proxy_pass http://node_backend;
        proxy_cache API_CACHE;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_lock on;

        # Useful header for debug
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

The `proxy_cache_path` directive defines where cached files will reside on the Linux disk. `keys_zone=API_CACHE:10m` creates a 10-megabyte memory area to store lookup keys and metadata, which is enough for tens of thousands of indexed routes.

The `proxy_cache_use_stale` parameter is extremely useful for maintaining high availability. If the backend crashes or takes too long to respond to an update, Nginx continues serving the old version that was in the cache while trying to re-establish the connection.

When inspecting the `X-Cache-Status` header in your application's HTTP responses, you will see values like `HIT` (served directly from the Nginx cache), `MISS` (fetched from the backend and saved to cache), or `BYPASS`.

If you need to serve purely static files generated by a frontend build (such as Vite or exported Next.js), it is even more performant to have Nginx read the files directly from disk with `try_files`, completely bypassing the proxy for these extensions:

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2)$ {
    root /var/www/myapp/dist;
    expires 30d;
    add_header Cache-Control "public, no-transform";
    access_log off;
}
```

## Securing the API with Rate Limiting

Leaving an authentication route (`/api/login`) or critical endpoints open without frequency restrictions is an invitation to brute force attacks and aggressive scraping. Nginx implements rate limiting through the Leaky Bucket algorithm, processing requests at a constant rate and discarding or queuing the excess.

To configure, we define the memory space and the request rate per second (r/s) or per minute (r/m):

```nginx
# In the http context
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api_general:10m rate=30r/s;

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # ... previous configurations ...

    # Sensitive authentication route
    location /api/auth/login {
        limit_req zone=login_limit burst=2 nodelay;
        limit_req_status 429;

        proxy_pass http://node_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # General API
    location /api/ {
        limit_req zone=api_general burst=10 nodelay;
        limit_req_status 429;

        proxy_pass http://node_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Using `$binary_remote_addr` instead of `$remote_addr` is a classic memory optimization on Linux: it stores the IPv4 address in just 4 bytes, taking up much less space in the 10-megabyte shared zone.

The `burst=10 nodelay` parameter allows the client to send momentary spikes of up to 10 requests beyond the base rate without experiencing forced delay. If the volume exceeds that burst limit, Nginx immediately terminates the connection and returns HTTP code 429 (Too Many Requests).

This protects the application from overloads even before Node.js spends CPU cycles parsing the JSON request body.

## Validation and zero-downtime deployment

A common mistake when editing Nginx configurations is to abruptly restart the service, dropping all open connections if there is a syntax error in any imported file.

The professional maintenance flow in the Linux terminal should always follow two steps: test the configuration and reload the processes gracefully.

```bash
# 1. Test the syntax of all configuration files
sudo nginx -t

# 2. If the syntax is OK, reload without closing active connections
sudo systemctl reload nginx
```

The `reload` command instructs the Nginx master process to re-read the configuration files, start new worker processes with the changes, and shut down the old ones only after they finish responding to ongoing requests. There is no packet loss and the switch occurs invisibly for the users.

## Practical Takeaways

- Never expose application servers (Node.js, Flask, FastAPI) directly to the public internet; use Nginx at the edge.
- Always forward the `Host`, `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers in proxy directives to maintain client traceability in the backend.
- Enable HTTP/2 alongside SSL to allow multiplexed data transmission over the same TCP connection.
- Isolate sensitive login endpoints and heavy search queries using `limit_req` zones to mitigate brute force attacks and scraping.
- Let Nginx serve static files and cached assets directly from disk, saving backend server threads and CPU cycles.
- Use `nginx -t` before any restart and prefer `systemctl reload nginx` to avoid downtime in production environments.

## Sources

- [Nginx Official Documentation](https://nginx.org/en/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Instructions by EFF](https://certbot.eff.org/)
- [Nginx Admin Guide: Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)