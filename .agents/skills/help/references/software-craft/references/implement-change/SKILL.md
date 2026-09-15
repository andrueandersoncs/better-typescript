---
name: implement-change
description: Implement defined software behavior using repository conventions and focused verification.
---

# Implement Change

## Inputs

The accepted software behavior or plan, relevant repository evidence, scope constraints, and required runtime or command proof.

## Process

1. Pin the accepted behavior, scope, and completion evidence. Read only the relevant source, callers, tests, commands, and repository rules. Resolve material contradictions before editing.
2. Identify the real entry point and one focused command or runtime scenario that exercises the behavior. Capture the current result or reproducible failure before changing it when the surface can be run.
3. Choose the smallest complete vertical slice and its mutation order. Use an isolated workspace when the harness or repository provides one and concurrent or risky work warrants it.
4. Reuse an existing behavior check when it can expose the change. Add a regression guard only for a plausible future failure; demonstrate that it detects the defect before fixing it. Follow an explicit test-first request.
5. Implement the owning mechanism using existing patterns and dependencies. Introduce an abstraction only when current repetition or contract pressure proves its value.
6. Complete every caller migration in the accepted scope. Remove obsolete paths, aliases, comments, and dead compatibility code. Retain a live compatibility path only under [ship-change's migration authority](../ship-change/SKILL.md#migration), with its owner, removal condition, and evidence.
7. Run the focused command or scenario through the real entry point. On failure, inspect the new evidence, repair the owning cause, and repeat this step before advancing. Then run affected surrounding checks. Use [verify-change](../verify-change/SKILL.md) when the claim needs its dedicated proof; broaden checks only for a new change, failure, or unresolved concern.
8. Exercise the finished result as its consumer. Re-read consequential decisions before they spread, remove temporary instrumentation, and continue the repair loop until the completion condition holds.

## Tool recipes

For an explicit Better TypeScript setup request, apply [the Better TypeScript recipe](references/setup-better-typescript.md) within this implementation workflow.

## Output

Working repository behavior through the real entry point, every caller migration requested by the accepted scope, and focused evidence.

## Done

The smallest complete behavior works through its real entry point, every requested caller is migrated, regression-prone behavior has a meaningful guard, and no obsolete or unapproved old path or debug residue remains. Continue through verification and repairs within the requested scope; a first implementation or skill handoff is not a review checkpoint unless the user requested one.
