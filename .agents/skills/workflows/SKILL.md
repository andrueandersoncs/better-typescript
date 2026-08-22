---
name: workflows
description: Create or decompose workflow skills, dry-run workflows as callstack traces, and model workflows as state machines. Use when asked to design, document, improve, split, trace, simulate, visualize, or diagram a workflow, procedure, algorithm, function, or skill.
---

# Workflows

Infer the user's intent from their requested outcome and output format. Read and follow the matching reference:

- **Create or improve a workflow skill:** [`references/convert-to-skill/SKILL.md`](references/convert-to-skill/SKILL.md)
- **Decompose a skill into reusable workflows:** [`references/decompose/SKILL.md`](references/decompose/SKILL.md)
- **Dry-run or trace execution step by step:** [`references/simulate-callstack/SKILL.md`](references/simulate-callstack/SKILL.md)
- **Visualize states, events, and transitions:** [`references/simulate-state-machine/SKILL.md`](references/simulate-state-machine/SKILL.md)

Prefer explicit clues such as `create`, `decompose`, `callstack`, `trace`, `state machine`, `Mermaid`, or `diagram`. When the wording is ambiguous, choose the reference whose output best matches the user's requested result. Default a simulation without visual or state-machine clues to a callstack. Use every matching reference when the request combines outcomes.

Treat each reference as the named component skill. When a reference invokes another component by name, load that component from the map above.
