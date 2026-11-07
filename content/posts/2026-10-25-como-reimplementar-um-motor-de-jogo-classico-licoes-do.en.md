---
title: "Reimplementing a classic game engine: lessons from the fheroes2 project"
date: "2026-10-25"
category: "tutorial"
tags: ["reverse-engineering", "c++", "jogos", "engenharia-de-software", "open-source"]
excerpt: "How do you rebuild a classic game without the original source code, preserving pixel‑by‑pixel nostalgia, without getting stuck in MS‑DOS mode?"
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-10-25-como-reimplementar-um-motor-de-jogo-classico-licoes-do.jpg"
comments: true
translationKey: "2026-10-25-como-reimplementar-um-motor-de-jogo-classico-licoes-do"
---
How do you rebuild a classic game without the original source code, preserving pixel‑by‑pixel nostalgia, without getting stuck in MS‑DOS mode?

Ask the team behind **fheroes2**, an open‑source project that reimplements the classic *Heroes of Might and Magic II* (1996) from scratch. They have no access to New World Computing’s original engine. All they have is the 1996 final binary, a pile of data (sprites, maps, sounds) and the collective memory of thousands of players. The challenge is monumental: recreate the game physics, the opponent AI, the isometric rendering, and that “just right” feel that defines a cult title. Any subtle deviation, a wrong damage calculation, a non‑optimal movement path, is immediately flagged by the community.

This goes far beyond nostalgia. It’s a practical lesson in reverse engineering, resilient system design, and long‑term compatibility maintenance. The same lessons you face when modernizing a legacy API, migrating a critical database, or building an internal tool that must coexist with old systems.

I know a bit of that compatibility pain. Since 2020, I’ve worked in the commercial department of a retail store, where I led the migration of a database with more than 10,000 products between systems. We implemented and customized OSPOS, an open‑source point‑of‑sale (POS) system. The daily challenge is making a stack of technologies, from the POS’s legacy PHP to e‑commerce integrations, work in harmony, keeping the store’s operation running without interruption. It’s fertile ground for learning about stable interfaces and the importance of rigorous testing.

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/fheroes2-screenshot.png" alt="Screenshot of the fheroes2 game showing the classic isometric interface, with heroes, castles, and the strategic map" loading="lazy">
<figcaption>fheroes2 interface: a faithful recreation of the original HOMM2 isometric view and color palette. (Source: Official repository fheroes2/fheroes2, GPLv2 license)</figcaption>
</figure>

## The case of fheroes2: deconstructing a 90s classic

Heroes of Might and Magic II isn't just a game. It's an ecosystem of interdependent rules. Every unit in battle has attack, defense, health, and speed attributes. The map terrain affects movement. Troop morale and luck can turn the tide. The original engine, written in C++ for DOS, performed all these calculations deterministically, but the exact details were locked inside the compiled code.

The fheroes2 project is born from the need for preservation and portability. Playing the original today requires emulators or solutions like DOSBox. The goal was to create a native reimplementation in modern C++ that runs on Windows, Linux, macOS, and even embedded platforms like the Raspberry Pi, using the same graphics and sound database from the original game (which the player must legally own).

The process resembles reverse engineering a network protocol. The developers use tools like debuggers to run the original game instruction by instruction, observing how the memory changes after each action. They assemble "unit tests" based on behavior: they save the original game's state, perform a specific action (like an attack), save the state again, and then try to replicate the exact same state change in their own engine.

```cpp
// Hypothetical example (inspired by the project's philosophy) of a test validating damage calculation:
void test_creature_damage() {
    // Scenario setup based on memory dump from the original game
    Creature attacker{"Archer", Attack: 5, Defense: 3};
    Creature defender{"Goblin", Attack: 2, Defense: 1, Health: 5};

    // Executes fheroes2's battle logic
    int damageDealt = BattleEngine::calculateDamage(attacker, defender);

    // The expected value is obtained by observing the result in the original game
    int expectedDamage = 3; // Value extracted from the original engine via debugging

    assert(damageDealt == expectedDamage);
}
```

This "black box testing" method is fundamental. Without the source code, there's no way to know *why* the damage is 3. They only know that it *must be* 3 for the player's experience to be identical. Any discrepancy is a bug in the new engine.

<figure>
<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Reverse_engineering_process_diagram.svg/800px-Reverse_engineering_process_diagram.svg.png" alt="Diagrama de fluxo do processo de engenharia reversa: Análise, Extração de Informação, Modelagem e Reconstrução" loading="lazy">
<figcaption>Simplified diagram of the reverse engineering cycle. The fheroes2 project follows a similar flow: analyze the binary, extract game rules, model the logic, and rebuild the engine. (Source: Wikimedia Commons, adapted, CC BY-SA 3.0 license)</figcaption>
</figure>

## Architecture and main technical challenges

The fheroes2 architecture is a lesson in separation of concerns. The game engine (*core*) is kept as pure as possible, free of UI or system dependencies. It exposes an internal API that models the game state: the map, players, towns, heroes, and battles.

**Rendering and Input Abstraction:** The original DOS code drew pixels directly to VGA and read mouse/keyboard via interrupts. fheroes2 abstracts this into interfaces like `Display` and `Input`. The concrete implementation uses SDL2, a cross-platform library for audio, keyboard, mouse, and graphics. This allows, in theory, the game *core* to function with any graphical backend, provided someone implements those interfaces.

**Asset Management:** Sprites, sounds, and maps are original game files in proprietary 90s formats (like .PCX for images). The project includes specialized *readers* that decode these formats into raw bitmaps and audio that SDL2 can consume. This compatibility layer is critical, it's what allows using the genuine data files.

**AI and Pathfinding:** One of the most complex challenges is replicating the opponent's artificial intelligence. In HOMM2, the AI makes decisions about map exploration, town building, and hero movement. The fheroes2 developers can't simply copy an algorithm; they must infer it by observing behavioral patterns. Often, the solution is to implement a "good enough" AI that passes observed behavior tests, even if its internal workings differ from the original.

**Determinism and Network Synchronization:** To support multiplayer matches, the game state must be perfectly deterministic. The same set of inputs, processed on different machines, must generate exactly the same result. This demands strict control over random numbers (using fixed seeds for tests) and ensuring floating-point operations (which can vary between CPUs) don't affect the core logic. The common solution is to use integer arithmetic for critical calculations.

## Practical Engineering Lessons: Compatibility, Testing, and Community

**1. Write to the Interface, Not the Implementation:**
fheroes2 demonstrates the value of this principle. The game engine does not call `SDL_RenderCopy()` directly. It calls `renderer.drawSprite()`. The dependency is inverted. This reminds me of a problem I faced in [OSPOS](https://github.com/opensourcepos/opensourcepos) (the open-source POS I customized). To integrate with a new payment gateway, I didn't modify the core sales logic. I created a `PaymentProvider` interface and a concrete implementation for the new gateway. The sales system calls the interface, remaining agnostic to the actual provider. The change was local and testable.

**2. Behavior-Based Tests Are Your Contract:**
When you don't control the official spec (like a third-party API or, in this case, the original game), your tests should validate the observed behavior, not the implementation. In fheroes2, the tests are a suite of expected game state "snapshots". In more conventional projects, this translates to integration tests that verify your business layer produces the correct responses for a given request, regardless of what happens in the database or external service details.

**3. The Community Is Your Load QA:**
Open-source reimplementation projects thrive on community feedback. A player notices that a specific type of spell is causing 1 less damage point in a certain situation. That report becomes a GitHub issue, which in turn generates a new test case. The lesson is: make it easy for users to report discrepancies. Detailed logs, tools to save and reproduce system states are invaluable. In one of my projects, [provider-health-daemon](https://ismaeltech.com/projetos/provider-health-gateway) (a gateway for AI APIs), I implemented an *audit trail* mode that logs every request and response. When a user reports odd behavior, I ask for the trace ID. I can reproduce the exact flow and isolate the bug.

**4. Compatibility Is a Product:**
Maintaining compatibility with the original title's saved games is a promoted feature of fheroes2. This requires an adaptation layer that knows how to read the old file format and map it to the new engine's internal data structures. It's analogous to maintaining backward compatibility in a web API. You version the endpoints (`/api/v1/`, `/api/v2/`) or design your data format (like JSON) to be extensible, adding new fields without invalidating old clients.

## How to apply this learning to modern projects

You're not reimplementing a DOS game, but the principles are transferable.

**Modernizing an Internal Tool (Legacy):**
Let's say you inherited a critical 2005 Perl script that generates reports. Rewriting it in Python from scratch is risky. The fheroes2 approach suggests:
* **First, create an acceptance test suite.** Run the legacy script with a battery of example inputs and capture the outputs (CSVs, PDFs). These are your "snapshots" of correct behavior.
* **Reimplement in modules.** Break the logic into pure functions (without side-effects) that can be unit tested.
* **Keep the user interface identical initially.** If the script was invoked by `./gerar_relatorio.sh --month=12`, your new system should be invoked exactly the same way. The migration is invisible to the user.
* Only after all acceptance tests pass, think about adding new features or a better interface.

**Designing an API with Longevity:**
APIs change. The lesson from determinism and compatible saves is: plan for evolution from day zero.
* Use semantic versioning for your API client.
* Include a `version` field in the request header or body.
* Never remove or rename fields in an existing version. Mark them as `deprecated` and keep them functioning for a predefined cycle.
* Document behavior changes clearly, just as fheroes2 documents which mechanics have already been faithfully replicated.

**Building an Integration Ecosystem (like a POS or ERP):**
This is my day-to-day. A POS like OSPOS needs to integrate with tax issuers, payment gateways, marketplaces, and ERPs. The strategy is modular:
* Define stable interfaces for integration points (e.g. `interface InvoiceEmitter`).
* Provide clear SDKs or examples for third parties to develop *plugins*.
* Maintain an integration test suite that simulates the most common partners. Any change to the core must pass these tests to ensure it hasn't broken existing integrations.
* This architecture allows the system's base to evolve without freezing the ecosystem around it.

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/modern-legacy-integration.png" alt="Architecture diagram showing a stable core (Core) with well-defined interfaces, connected to legacy and modern modules via adapters" loading="lazy">
<figcaption>Compatibility architecture: a stable core (Core) communicates with legacy and modern systems through well-defined interfaces and adaptation layers (Adapters).</figcaption>
</figure>

### Practical Takeaways

* **Contract Over Implementation:** Your system should fulfill a behavior contract (integration tests), not be a copy of an internal implementation.
* **Abstract External Dependencies:** Isolating UI, database, and external service code behind interfaces allows you to swap the underlying technology without refactoring business logic.
* **The Community Finds the Edge Cases:** Design your software to be observable and easy to debug. Structured logs and the ability to reproduce states are powerful tools.
* **Compatibility is a Feature You Design For:** Think about the evolution of your data formats and APIs from the start. Add fields, don't remove them.
* **Reimplementation is a Systems Design Exercise:** More than just rewriting code, it's an opportunity to reassess separation of concerns and coupling. Use it to correct technical debt from the original version.

The fheroes2 project is more than a sophisticated emulator. It's a living case study on how to handle complex, closed systems while maintaining fidelity and modernizing the foundation. For us developers, it serves as a reminder: the best engineering often isn't about creating something radically new, but understanding an existing system so deeply that you can rebuild it, and, in the process, make it better for the future.

## Sources

- [Official fheroes2 repository on GitHub](https://github.com/fheroes2/fheroes2)
- [SDL2 (Simple DirectMedia Layer) Documentation](https://wiki.libsdl.org/SDL2/FrontPage)
- [Heroes of Might and Magic II: Wikipedia page with history and technical details](https://en.wikipedia.org/wiki/Heroes_of_Might_and_Magic_II)
- ["Software Reverse Engineering" article on IEEE Computer Society](https://www.computer.org/csdl/magazine/co)
- [OSPOS (Open Source Point of Sale) Documentation](https://opensourcepos.org/)
- [MDN Web Docs: API Design Guidelines](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/API_guidelines)