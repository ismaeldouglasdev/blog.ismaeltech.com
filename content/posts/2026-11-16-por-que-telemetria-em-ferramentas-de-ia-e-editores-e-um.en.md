---
title: "Why telemetry in AI tools and editors is a real risk for your code"
date: "2026-11-16"
category: "article"
tags: ["telemetry", "privacy", "security", "ai", "editors"]
excerpt: "Your editor knows what you type before you save. Understand what leaves your machine, what the policies say, and how to audit every connection."
cover:
  image: "/covers/2026-11-16-por-que-telemetria-em-ferramentas-de-ia-e-editores-e-um.jpg"
lang: "en"
translation_of: "2026-11-16-por-que-telemetria-em-ferramentas-de-ia-e-editores-e-um"
translationKey: "2026-11-16-por-que-telemetria-em-ferramentas-de-ia-e-editores-e-um"
---

Your code editor knows what you type before you save the file. Every keystroke can feed usage metrics, extension telemetry and, with AI tools, the full context you pasted into the chat. Most of the time you never notice any of this: installation ships with collection on by default, and consent happens in an "Accept all" click nobody reads. The problem stops being abstract when the code leaving the machine belongs to a client, to an internal system, or to a product that has not even launched yet.

This is not about quitting AI or avoiding extensions. It is about understanding the path your code travels, telling legitimate telemetry apart from excessive collection, and building an audit routine that survives a normal workday.

## What tools collect (and why "telemetry" is more than metrics)

Telemetry, in the industry definition, is the automatic collection of usage data: commands executed, load times, errors, installed plugins, hardware. In theory it exists to improve the product. In practice the scope varies enormously across tools, and the label "telemetry" hides very different categories.

It helps to separate three layers:

1. **Editor telemetry**: usage events, stability, performance. VS Code, for example, offers a granular control (turn everything off, or send only error data).
2. **AI context**: when you use an assistant, the code snippet, the open file, the chat messages and sometimes the entire repository content can be sent for inference. That is not telemetry in the classic sense - it is the product working. And it is almost always optional.
3. **Extensions and plugins**: each extension is a third-party program with its own permissions. Many bundle their own analytics (Google Analytics, Segment, vendor telemetry) unrelated to the editor.

When someone says "I disabled telemetry", they usually turned off layer 1 only. Layers 2 and 3 stay active - and those are exactly the ones that carry content, not just metrics.

## The blind spot: proprietary code in AI context

Live assistance tools changed the nature of the risk. Before, the worst telemetry scenario was an error report with a stack trace fragment. Now a single interaction can send:

- the open file with business logic;
- whole functions with client names, internal parameters and comments;
- the diff of a change before the commit;
- the content of a chat with architecture decisions and endpoints.

Each vendor's policy changes the game. Some use the data to train models; others promise not to train but keep it for a retention period; others process everything in memory and discard it. The difference between those promises rarely shows up in the install flow - it lives in a privacy document almost nobody opens.

The risk is not only legal. There is accidental leakage (a secret in context), third-party intellectual property exposure, and the compliance problem: sending personal data from users across borders without a legal basis is a direct LGPD and GDPR violation, regardless of intent.

## What the policies say: VS Code, Copilot and extensions

Read the official documents instead of trusting defaults:

- **VS Code**: the project's telemetry page documents exactly what is collected, when it is sent and how to turn it off (`telemetry.telemetryLevel`). It is one of the clearest documents in the market - use it as a reference.
- **GitHub Copilot**: the official documentation describes which context data is sent for inference, how suggestions are generated and what happens to the code afterwards. Pay close attention to the retention and training sections.
- **Extensions**: no single policy. Each one has its own. Popular lint, formatting and deploy extensions frequently bundle their own collection.

The point most people miss: turning off editor telemetry does not turn off extension collection or context sent to the AI. These are three independent decisions, and you need to make all three.

## Concrete risks: from leakage to compliance

Three real scenarios:

**Secret leakage.** An assistant with broad context can capture an API key from a `.env` file you opened to "understand that error". Some products filter known secrets; most guarantee nothing. The defense is behavioral: never open credential files with the assistant active, and keep secrets out of the repository.

**Compliance.** If your product processes personal data from users in the European Union or Brazil, sending excerpts with that data to a service hosted abroad requires a legal basis (consent, contract performance, legitimate interest with an impact assessment). An assistant that sends context "just to suggest code" has no built-in exception.

**Intellectual property.** Client or employer code sent for third-party inference can violate a confidentiality agreement even if the vendor swears it does not train on your data. Temporary retention and the vendor's own audit logs are already enough exposure for many contracts.

## How to audit what leaves your machine

The good news: auditing is simpler than it looks. You do not need to be a network specialist to see your editor's traffic.

**1. Choose the telemetry level explicitly.** In VS Code, the path is `settings.json`:

```json
{
  "telemetry.telemetryLevel": "off"
}
```

Do the same in every extension that offers its own option. "Off" in the editor with a collecting extension solves nothing.

**2. Watch the real traffic.** A local proxy shows every request:

```bash
# install once
pip install mitmproxy

# capture the editor's traffic (e.g., VS Code accepts a proxy setting)
mitmdump --listen-port 8080 -w editor.flows
```

With the proxy running, open the editor, use the assistant, save files and watch which domains receive data. Guaranteed surprise: there are always more connections than expected.

**3. Isolate what cannot leave.** Where the environment allows, configure firewall or DNS to block known telemetry domains and keep the AI assistant on a separate profile/network when the project is sensitive.

**4. Treat the repository as a perimeter.** Before sending context, review what is in the repo: `.env`, keys, production data in test files. The best filter is the one that does not exist in the directory.

## Checklist: reducing the exposure surface

- Editor telemetry at `off` (or the minimum level you consciously accept).
- Audited extensions: uninstall what you do not use; for the rest, look for the telemetry option in settings.
- AI assistant with context limited to the open file, not the whole workspace, on client projects.
- Clean repository: no secrets, no real production data in test files.
- Monitored network at least once: run the proxy for one workday and write down what you saw.
- Internal document: which tool, which policy, which legal basis. If the answer is "I don't know", the problem is bigger than telemetry.

## Conclusion

Telemetry and AI assistants are not villains by nature - they are tools with a privacy cost baked in, and that cost rarely appears in the price. The difference between conscious use and accidental exposure comes down to three habits: configure explicitly instead of accepting defaults, audit the traffic at least once, and treat the repository as a security perimeter. No vendor will do this work for you, because no vendor knows your contract, your client and your risk.

The code you write today carries decisions beyond the commit. It is worth knowing where it goes before you click "accept".

## Sources

- [VS Code Docs: Telemetry](https://code.visualstudio.com/docs/configure/telemetry) - What is collected, per event, and how to configure `telemetry.telemetryLevel`.
- [Microsoft: Privacy Statement](https://privacy.microsoft.com/privacystatement) - Product privacy policy, including VS Code diagnostic data.
- [GitHub Docs: About GitHub Copilot](https://docs.github.com/en/copilot/overview-of-github-copilot/about-github-copilot) - Context sent, retention and use of inference data.
- [Lei nº 13.709/2018 (LGPD)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) - Personal data processing and international transfer.
- [GDPR Info](https://gdpr-info.eu/) - Consolidated text of the European regulation for comparison.
- [mitmproxy](https://mitmproxy.org/) - Proxy to inspect HTTPS traffic from your tools.