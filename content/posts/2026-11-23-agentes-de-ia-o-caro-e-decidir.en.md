---
title: "AI agents: the expensive part is not writing code, it is deciding"
date: "2026-11-23"
category: "article"
tags: ["ai", "agents", "engineering", "productivity", "architecture"]
excerpt: "Ponytail and improve point to the same shift: judge and plan with the expensive model, execute with the cheap one. The win is the code you never write."
cover:
  image: "/covers/2026-11-23-agentes-de-ia-o-caro-e-decidir.jpg"
lang: "en"
translation_of: "2026-11-23-agentes-de-ia-o-caro-e-decidir"
translationKey: "2026-11-23-agentes-de-ia-o-caro-e-decidir"
---

You ask for a date picker. The agent returns 335 lines, installs a library, and builds a calendar nobody requested. Another agent, guided by one rule in the repo, looks at the existing `Input` component, uses the browser `type="date"`, and writes ten lines. The difference was not the model. It was the decision made before the first `git apply`.

That is the idea behind two projects that showed up strong in the trending lists this week: [ponytail](https://github.com/DietrichGebert/ponytail) and [improve](https://github.com/shadcn/improve). One says the best code is the code you never wrote. The other says to use your most capable model to audit and plan, then leave execution to cheaper models. They sound like opposite advice. In practice, they are the same thesis cut in half.

## Ponytail: lazy about the solution, strict about reading

Ponytail is a single prompt, shipped as a skill for Claude Code, Codex, OpenCode, Cursor, and other agents. It tries to reproduce that senior dev who has seen the same problem fifty times: it reads your request, says nothing, and trades fifty lines for one.

The mechanism is a ladder. Before writing, the agent has to stop at the first rung that solves the problem:

<figure>
<img src="/media/2026-11-23-agentes-de-ia-o-caro-e-decidir-1.svg" alt="Seven rungs: need, existing code, standard library, native feature, installed dependency, one line, minimum plus test" loading="lazy">
<figcaption>The ponytail ladder: order matters because the cheapest rung is usually closer than it looks.</figcaption>
</figure>

1. Does this need to exist?
2. Is something in this repo already doing it?
3. Does the standard library solve it?
4. Does the platform provide it natively?
5. Is an installed dependency enough?
6. Can it be one line?
7. Only then, the smallest thing that works, plus a small test if there is logic.

The part that matters most sits outside the ladder: the author insists that the laziness belongs to the solution, never to the reading. The agent reads the code the change touches and traces the real flow before picking a rung. Validation at trust boundaries, data loss handling, security, and accessibility are not on the cutting list. The goal is not to save tokens. It is to write only what the task requires.

The numbers in the README are strong: 53% less code, 45% fewer tokens, and 26% lower cost in version 5, with 98% of risky logic covered by tests against 68% without the skill. Those are the authors' benchmark numbers, run over 39 tasks with five repeats. I did not reproduce them here. Even so, the direction matches what any PR review already shows: dead code is technical debt that nobody pays on the day it is written.

## Improve: the plan is the product

Improve, from shadcn, comes from the other side. It is a skill that audits the repo and writes plans into `plans/`. The core rule: the most capable model does the part where judgment compounds, understanding the code, deciding what is worth doing, and writing the spec. Cheaper models execute.

The output is not code. It is a markdown file with enough context for an executor that never saw the original conversation. That fixes a problem anyone who has delegated a task knows well: a plan that exists only inside the head of the agent that created it does not survive a session change.

<figure>
<img src="/media/2026-11-23-agentes-de-ia-o-caro-e-decidir-2.svg" alt="Flow: expensive model audits and writes the plan, the plan becomes a file with gates, a cheap model implements and tests, a human reviews the diff" loading="lazy">
<figcaption>The plan becomes a contract: whoever executes does not have to guess what the auditor meant.</figcaption>
</figure>

Three properties make those plans executable:

- **Self-contained.** Exact paths, excerpts of the current state, repo conventions with one example file, and commands that were already checked. No "as we discussed above".
- **Verification gates.** Every step ends with a command and the expected output. The executor does not have to judge whether it worked.
- **Hard limits.** A list of what is out of scope and STOP conditions for when reality does not match the plan.

Improve also has a reconciliation pass: it checks what was applied, rewrites what moved, and points out what got stuck. That is one more layer over a common problem: a plan backlog that ages until nobody dares delete it.

## Where they converge

The two projects reach the same place by different routes.

Ponytail attacks too much code. Improve attacks too much undocumented decision making. One reduces what gets written. The other reduces what has to be interpreted again. Both move the expensive work to before the edit.

There is a simple account behind that. One hour of an expensive model to understand a subsystem and write a 200 line plan. Twenty minutes of a cheap model to execute that plan with gates. If the executor had to understand the subsystem on its own, it would take longer and fail more. The cost does not disappear. It moves from typing to judgment.

That also explains why using the cheapest model for everything usually pays less than it looks. Saving on diagnosis is the most expensive way to cheapen a project. The cheap model earns its place when the problem has already been decomposed and verification is mechanical.

## How to apply this without adopting another tool

You do not need to install either project to use the idea. What needs to change is the order of the request.

**1. Ask for reading before asking for code.** "Read these four files, tell me where this change touches and what already solves it." Only then: "Now write the plan."

**2. Put the ladder in AGENTS.md.** Five lines are enough:

```markdown
Before writing code:
1. Does the item already exist in the repo?
2. Does the standard library solve it?
3. Does the platform provide it natively?
4. Is an installed dependency enough?
5. Only then write the minimum, with a test for branching logic.
Never cut validation at trust boundaries, security, data loss handling, or accessibility.
```

**3. Store plans as files.** Use `plans/001-*.md` with the current state, numbered steps, a verification command, and a STOP condition. If the plan does not fit in a file, it is not ready for execution.

**4. Measure reuse.** Every agent response should end with what was reused and what was created. If that ratio is always inverted, the rule is not being followed.

**5. Review like someone who will be paged at 3h.** The ponytail review reads the code around the change, not just the diff. That is how it found a renamed field that broke a feed in an untouched file. That is exactly the kind of failure that slips through when the executor only knows the lines it changed.

## Where this does not apply

A small greenfield project or a disposable prototype does not need a 200 line audit. If you are testing an idea that will die tomorrow, writing the code is the fastest way to learn. There are also cases where the constraint is artificial: an exercise, an interview, a benchmark. Asking for reuse there gets in the way.

Another honest limit: the ladder requires knowledge of the codebase. In a large, badly documented project, the expensive model will spend time just finding where things live. That is not a failure of the approach, it is the price of documentation debt showing up on the invoice.

## What stays

The change is not using less AI. It is using AI in the right place. Judgment remains the scarce part. Typing became a commodity. When you separate the two, the result is smaller, cheaper, and easier to review, with the added benefit that the plan outlives the session that wrote it.

Both projects are worth a read, even if you install neither: [ponytail](https://github.com/DietrichGebert/ponytail) for the ladder and the review, [improve](https://github.com/shadcn/improve) for the plan format. Both are MIT.

Working on something similar? [Let's talk](https://ismaeltech.com/#contato).
