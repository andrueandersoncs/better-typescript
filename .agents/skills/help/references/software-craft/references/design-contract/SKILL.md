---
name: design-contract
description: Design a domain model, module seam, public API, schema, or architecture as a small stable contract. Use before consequential boundary changes, new modules, shared interfaces, data migrations, or architecture refactors.
---

# Design Contract

## Inputs

The accepted outcome, current consumers and seams, domain vocabulary, compatibility constraints, and available evidence.

## Method

1. Inspect actual consumers, repository vocabulary, existing seams, and compatibility constraints.
2. Make domain terms exact. Test ambiguous nouns and relationships against representative scenarios; update the canonical glossary when one exists.
3. Define observable behavior before structure: inputs, outputs, errors, side effects, ordering, ownership, and invariants.
4. Design the smallest interface that hides the most volatile implementation detail. Prefer a deep module: high caller leverage behind a narrow surface.
5. For a consequential seam, design it at least two materially different ways and compare misuse risk, locality, testability, compatibility, and migration cost.
6. Validate at external trust boundaries. Keep internal code simple and typed. For a material threat, authorization, or abuse-path question, use [secure-system](../secure-system/SKILL.md#method) as supporting guidance while retaining ownership of the contract.
7. Preserve compatibility deliberately. Prefer additive evolution; for retries and state changes, define idempotency, duplicate handling, and unknown outcomes.
8. Choose the highest stable public seam for behavior tests. Avoid tests coupled to private structure.
9. Record an ADR only when the decision is hard to reverse, surprising, and supported by a real tradeoff.

## Output

An explicit domain, API, schema, or architecture contract with invariants, observable behavior, compatibility decisions, and a test seam.

## Done

Callers can use and test the contract without knowing its implementation, every observable behavior is intentional, and migration consequences are explicit.
