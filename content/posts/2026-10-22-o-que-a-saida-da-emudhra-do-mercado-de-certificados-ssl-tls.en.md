---
title: "What eMudhra's departure from the SSL/TLS certificate market means for you, the developer"
date: "2026-10-22"
category: "tendencia"
tags: ["seguran\u00e7a", "ssl", "tls", "ca"]
excerpt: "Your website or API could be about to go offline for millions of users without you having made a single change to your code. The only cause? One of the trust seals that"
cover:
  image: "/covers/2026-10-22-o-que-a-saida-da-emudhra-do-mercado-de-certificados-ssl-tls.jpg"
comments: true
translationKey: "2026-10-22-o-que-a-saida-da-emudhra-do-mercado-de-certificados-ssl-tls"
---
Your website or API could be about to go offline for millions of users without you having made a single change to your code. The only cause? One of the trust seals that guarantees the secure connection has simply ceased to exist.

That’s what recently happened with eMudhra, a Root Certificate Authority (CA) approved by Microsoft and Apple, which announced its exit from the public SSL/TLS certificate market. Overnight, certificates issued by it could become invalid, causing modern browsers to block access to your domains with a frightening "your connection is not private" warning. The impact is silent, global, and affects everything from a developer's personal blog to critical business APIs.

You may not have heard of eMudhra, but you’ve likely already encountered their work. The practical question every developer, DevOps engineer, or product owner needs to answer now is straightforward: how do I know if my project is one of the affected ones and, if it is, what should I do about it?

## What Happened and Why It Matters

Modern web infrastructure relies on a trust network called Public Key Infrastructure (PKI). In this system, root Certificate Authorities, such as ISRG (which operates Let's Encrypt) or DigiCert, act as global "digital notaries," recognized by operating systems and browsers. Other CAs, like eMudhra was, can be approved by these roots, delegating to them the power to issue certificates that will also be trusted.


<figure>
<img src="/media/2026-10-22-o-que-a-saida-da-emudhra-do-mercado-de-certificados-ssl-tls-1.jpg" alt="What eMudhra&#x27;s departure from the SSL/TLS certificate market means for you, the developer" loading="lazy">
<figcaption>Brief explanation of how SSL certificates function. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3A1258X489_How-SSL-Certificates-Work.jpg">1258X489 How-SSL-Certificates-Work.jpg</a> por Drew Carver1 — <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> · via Wikimedia Commons</figcaption>
</figure>

When a CA like eMudhra ceases to operate in the public market, the process of "distrust" begins. First, it stops issuing new certificates. Then, existing certificates continue to work until their expiration date, but there is a major catch. If the CA does not keep its validation servers (OCSP) and revocation lists (CRL) online, browsers attempting to verify a certificate's validity may fail this check. Depending on their configuration, they may treat this failure as a sign that the certificate is invalid or potentially compromised, blocking access.

The announcement was not a bug; it was a planned feature removal. And it exposes an inherent fragility of the system: the dependency on third parties that you, as a developer, never directly chose. You can perfectly manage your code, your infrastructure, and your automatic renewals, but if the entity that signed your certificate disappears, all your effort goes down the drain.

A system's resilience isn't just about server uptime, but about the health of all its external dependencies. And an invalid certificate is a network failure that happens on the user's client, untreatable by your internal monitoring, and with the power to bring everything to a complete halt.

## How to check if you're affected

Before panicking, the first step is a simple diagnosis. The good news is you don't need to be a cryptography expert to do this.


<figure>
<img src="/media/2026-10-22-o-que-a-saida-da-emudhra-do-mercado-de-certificados-ssl-tls-2.jpg" alt="What eMudhra&#x27;s departure from the SSL/TLS certificate market means for you, the developer" loading="lazy">
<figcaption>MOBILE EV SSL CERTIFICATE. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AMOBILE_EV_SSL_CERTIFICATE.jpg">MOBILE EV SSL CERTIFICATE.jpg</a> por Русский Хакер — <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> · via Wikimedia Commons</figcaption>
</figure>

**1. Direct inspection in the browser**

The quickest way is to access your site via HTTPS, click the lock icon next to the URL in the address bar, and select "Connection is secure" > "Certificate is valid." A detailed window will open. Look for the "Issued by" field. If you find "eMudhra" or "emSign" in the name, that's your problem.

**2. Using OpenSSL via the command line**

For servers, APIs, or to automate checking across multiple domains, `openssl` is your tool. The command below fetches the certificate and displays its issuer.

```bash
openssl s_client -connect your-domain.com:443 -servername your-domain.com 2>/dev/null | openssl x509 -noout -issuer
```

An output containing `issuer= /C=IN/O=eMudhra/...` confirms the origin. You can extend this command in a bash script to scan a list of domains, something I routinely do to monitor the health of my projects. For example, in one of my side projects that manages health checks for multiple services, a similar step is crucial.

**3. Online verification tools**

Services like [SSL Labs' SSL Test](https://www.ssllabs.com/ssltest/) or [What's My Chain Cert?](https://whatsmychaincert.com/) are excellent for a deeper analysis. They not only show the issuer but also evaluate the complete trust chain, signaling if any intermediate certificate is about to lose its root validity.

If the check points to eMudhra, it's not the end of the world. It just means you have a proactive maintenance task to execute. Replacement is, in most cases, a straightforward process.

## Practical Guide: Replacing the eMudhra Certificate

The goal is to obtain a new certificate signed by an active and widely trusted CA, and install it on your server. Here are the most common paths.

**Option 1: Migrating to Let's Encrypt (certbot)**

Let's Encrypt is the default choice for most projects, offering free and automated certificates. If you already use Certbot, the migration is almost automatic.

First, revoke the old certificate (optional, but a good practice). Use the certbot revocation command with the corresponding key.

```bash
sudo certbot revoke --cert-path /etc/letsencrypt/live/your-domain.com/cert.pem
```

Next, force a renewal. Certbot will issue a new certificate from the ISRG chain.

```bash
sudo certbot renew --force-renewal --cert-name your-domain.com
```

After renewal, restart your web server to load the new certificate.

```bash
# For Nginx
sudo systemctl reload nginx

# For Apache
sudo systemctl reload apache2
```

**Option 2: Using a CDN Provider (Cloudflare)**

If you use Cloudflare as a reverse proxy (the famous "orange cloud"), the SSL layer can be managed by them. In the Cloudflare dashboard, go to SSL/TLS > Overview. The recommended mode is "Full (strict)". In this mode, Cloudflare provides a certificate between the browser and the CDN, and you can use a self-signed or Let's Encrypt certificate only between Cloudflare and your origin server, dramatically simplifying management.

The major advantage here is abstraction: the potential future distrust of a CA becomes Cloudflare's problem, which they will resolve at a global scale for all their customers.

**Option 3: Generating and Installing a Manual Certificate from Another CA**

For enterprise environments or those with specific requirements, you can purchase a certificate from a commercial CA (DigiCert, Sectigo, etc.). The general process is:
1.  Generate a Certificate Signing Request (CSR) on your server.
2.  Send the CSR to the vendor and validate the domain.
3.  Receive the certificate (.crt) and intermediate chain files.
4.  Install and configure the web server.

An example Nginx server block configuration with the new files would look like this:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
```

ssl_certificate /path/to/new-certificate.crt;
ssl_certificate_key /path/to/your-private-key.key;
ssl_trusted_certificate /path/to/intermediate-chain.crt;

# ... rest of the configuration
}
```

Regardless of the method, after replacement, validate the installation with the previous `openssl` command or by using `curl` to check if the connection is established without errors.

```bash
curl -I https://your-domain.com
```

## The Hidden Risk: The Concentration of the CA Market

The eMudhra situation serves as a warning for a larger structural problem. The internet's trust infrastructure rests on a relatively small number of entities. If a handful of CAs dominate the issuance of the vast majority of certificates, what happens if one of them suffers a massive security compromise? The root store committee (Apple, Google, Microsoft, Mozilla) would be forced into a catastrophic decision: revoke trust in that CA, which would instantly invalidate millions of websites, or delay action to avoid a digital blackout, but in turn leaving users at risk.

It's a classic dilemma between security and stability. As developers, our tendency is to abstract this risk away: we set up `ACMEv2` on Certbot once and forget it exists. The problem is that the most critical systems are usually precisely those we blindly trust, without mapping their single points of failure (SPOF). The issuing CA is one of them, and almost nobody monitors it.

There are movements within the industry trying to mitigate this. **ACME (Automated Certificate Management Environment)**, the protocol behind Let's Encrypt, is already a major step toward democratization. **Certificate Transparency (CT)** is another, a system of public, auditable logs where all certificate issuances must be recorded, making fraudulent certificate issuance more difficult. It's up to us, who build the web, to demand and adopt these practices.

The lesson for anyone running infrastructure is that robustness comes from redundancy and visibility. Ideally, a system would be able to switch CAs automatically on failure, exactly the way we handle servers behind a load balancer: if the primary origin goes down, traffic shifts without drama. We're not there yet for SSL certificates, but starting to treat a CA as a monitored dependency, and not as magic, is already progress.

## Conclusion and next steps

The eMudhra exit is not a global emergency, but it is a timely and valuable reminder that the web's infrastructure is a living organism, with parts that are born, change, and can die. Ultimately, the responsibility for the continuity of our services lies with us.

To summarize, your action plan should be:

*   **Verify now**: Use `openssl` or an online tool to audit all your active public and internal domains.
*   **Prioritize replacement**: If you find eMudhra certificates, schedule their replacement with your project's current CA (Let's Encrypt, Cloudflare, or another commercial provider) before validation issues occur.
*   **Monitor the trust chain**: Add issuer and expiration date checks to your infrastructure monitoring. Tools like Nagios, Prometheus Blackbox Exporter, or custom scripts can do this.
*   **Think about resilience**: Evaluate whether it makes sense for your project to use a CDN that abstracts SSL management or even consider acquiring long-duration certificates (where applicable) to reduce the frequency of single points of failure.

The web is built on layers of delegated trust. It is up to us, as developers, to ensure that when one of these layers dissolves, our projects don't collapse with it, but have the robustness to transition smoothly to the next. After all, the only constant in technology is change, and our greatest skill is our ability to adapt to it.

## Sources

-   [Let's Encrypt Documentation: Getting Started](https://letsencrypt.org/getting-started/)
-   [Certificate Transparency (CT) - Google Developers](https://developers.google.com/certificate-transparency)
-   [Mozilla Root Store Policy](https://www.mozilla.org/en-US/about/governance/policies/security-group/certs/policy/)
-   [OpenSSL Man Pages: s_client](https://www.openssl.org/docs/manmaster/man1/openssl-s_client.html)
-   [Cloudflare SSL/TLS Documentation](https://developers.cloudflare.com/ssl/)
-   [ACME Protocol (IETF RFC 8555)](https://datatracker.ietf.org/doc/html/rfc8555)