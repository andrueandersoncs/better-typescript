---
name: software-laws
description: Apply established software laws as context-aware guidance for planning, architecture, implementation, delivery, and review. Use when making software tradeoffs, assessing project risks, choosing designs, reviewing code or APIs, estimating work, or evaluating engineering practices.
---

# Software Laws

Use software laws as prompts for judgment, not as automatic verdicts. Read the [complete reference](references/reference.md) when exact wording, context, attribution, or sources matter.

## Method

1. State the outcome, project constraints, current evidence, and decision to make.
2. Select only laws that describe a relevant force. Translate each one into a concrete risk or prediction.
3. Identify competing forces. State which concern controls this decision and why.
4. Inspect the repository and actual usage. Measure or run the smallest useful test when a claim is uncertain.
5. Choose the simplest complete action supported by the evidence. Record the tradeoff and the signal that would justify revisiting it.

## Planning and Scope

- Start with the smallest system that works, then add complexity only for observed needs. Protect the product's core purpose from feature creep.
- Treat estimates as uncertain. Limit work in progress, shorten feedback loops, and include integration and coordination cost.
- Do not assume that adding people will recover a late project. Reduce scope or unblock the critical path first.
- Expect architecture to reflect communication paths. Align ownership and team boundaries with the desired system boundaries.
- Use metrics as signals rather than targets. Pair them with the real outcome and watch for gaming, shifted definitions, and misleading denominators.
- Prefer proven technology when stability is the main need. Prefer newer capability only when project evidence shows a material advantage.

## Design and Interfaces

- Assume users can depend on every observable API behavior. Inspect real consumers before changing behavior, and make compatibility decisions explicit.
- Keep abstractions small and understandable. Plan for the implementation details that leak through performance, failures, or operations.
- Choose languages and tools that provide the needed concepts directly. Avoid rebuilding higher-level facilities inside an unsuitable foundation.
- Make frequent interface targets easy to reach and use. Apply target size and distance to screens, commands, and API ergonomics.
- Design security to hold when the implementation is known. Keep secrets in keys or protected data, not in hidden design details.
- Balance tolerant input handling against ambiguity, maintenance, and attack surface. Use the protocol, threat model, and interoperability needs to decide strictness.

## Implementation and Performance

- Prefer code that is easy to debug over clever code that is merely easy to write.
- Avoid speculative micro-optimization, but do not ignore known load or architectural limits. Benchmark representative behavior before and after a performance choice.
- Treat cheaper compute and improved hardware as capacity that software and demand can consume. Set explicit performance budgets instead of assuming hardware gains will compensate.
- For AI systems, compare scalable search, learning, data, and compute with domain-specific methods using task evidence. Check data limits, cost, and evaluation quality before relying on scale.
- Treat generated or automated output as the result of inputs, objectives, tools, and checks. Verify its behavior rather than assuming originality or correctness.

## Delivery and Review

- Add reviewers for relevant knowledge and independent diagnosis, not as a substitute for clear ownership. Separate the value of more eyes from the coordination cost of more contributors.
- Invite correction with a concrete proposal, failing example, or falsifiable claim. Do not confuse argument volume with evidence.
- Give teams a clear mission and useful autonomy. Check incentives, communication paths, and role capability instead of assuming motivation or hierarchy guarantees results.
- Examine whether a process, team, or product benefits from preserving the problem it claims to solve. Judge success by the user outcome.

## Constraints

- Never use a law's name or slogan as sufficient justification.
- Distinguish descriptive trends from prescriptive rules.
- State important conflicts, especially simplicity versus scale, compatibility versus change, tolerance versus security, optimization versus maintainability, and added review versus coordination cost.
- Ground recommendations in current project context, observed behavior, measured data, or a small benchmark.
- Apply the laws only within the conditions that make their underlying mechanism relevant.
