---
name: implement-change
description: Implement defined software behavior using repository conventions and focused verification.
---

# Implement Change

## Inputs

The accepted software behavior or plan, relevant repository evidence, scope constraints, and required runtime or command proof.

## Method

1. Read the accepted outcome or plan, relevant source, callers, tests, commands, and repository rules. Resolve material contradictions before editing.
2. Use an isolated workspace when the harness or repository provides one and the change warrants isolation.
3. Choose the smallest complete slice. Prefer a public-seam tracer bullet over horizontal layers.
4. Use existing checks when they cover the change. Add a behavior-level regression test when it protects a plausible failure; establish that it detects the defect. Follow an explicit test-first request.
5. Verify the changed behavior with focused evidence. Use [verify-change](../verify-change/SKILL.md) when the claim needs a dedicated verification procedure. Once relevant checks pass, repeat or broaden them only for new changes, failures, or unresolved concerns. Keep the repository buildable and remove temporary instrumentation.
6. Follow existing patterns and dependencies. Introduce a new abstraction only when current repetition or contract pressure proves its value.
7. Re-read consequential decisions with fresh context before they spread. Resolve findings against the contract rather than accepting them by authority.
8. Complete every caller migration requested by the accepted scope. Remove obsolete paths, aliases, comments, and dead compatibility code. Retain an intentionally live compatibility path only under [ship-change's migration authority](../ship-change/SKILL.md#migration), with its migration owner, removal condition, and evidence.

## Tool recipes

For an explicit Better TypeScript setup request, apply [the Better TypeScript recipe](references/setup-better-typescript.md) within this implementation workflow.

## Output

Working repository behavior through the real entry point, every caller migration requested by the accepted scope, and focused evidence.

## Done

The smallest complete behavior works through its real entry point, every requested caller is migrated, regression-prone behavior has a meaningful guard, and no obsolete or unapproved old path or debug residue remains. Continue through verification and repairs within the requested scope; a first implementation or skill handoff is not a review checkpoint unless the user requested one.
