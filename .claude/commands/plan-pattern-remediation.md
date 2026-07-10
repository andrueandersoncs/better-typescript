---
description: Turn a maintainer-observed code pattern into a concrete remediation plan
argument-hint: <pattern, file path, or Better TypeScript output>
---

Turn the following maintainer observation into a concrete Better TypeScript
remediation plan:

$ARGUMENTS

This is a planning command. Do not implement the plan, modify TypeScript, alter
the preset, or commit changes unless the maintainer explicitly asks for that in
a later request.

## Goal

Start from: “I do not like this code pattern in code Better TypeScript was
applied to.” End with a small, reviewable plan that chooses deliberately among:

- refactoring the observed code without changing the analyzer;
- adding a check;
- updating a check;
- deleting or merging checks;
- changing derived advice; or
- keeping the default preset unchanged and using explicit project wiring.

Do not assume that every disliked pattern should become a default rule.

## 1. Establish the candidate policy

Turn the observation into a precise proposed invariant. Capture:

- a minimal example of the disliked pattern;
- the desired replacement or desired code shape;
- why it is undesirable (correctness, architecture, Effect idiom, performance,
  maintainability, or consistency);
- the closest similar examples that must remain allowed; and
- whether the maintainer wants Better TypeScript to report it, change aggregate
  guidance about it, or merely refactor the current code.

If the input does not contain enough information to state the invariant, inspect
the cited code and report/output first. Ask only for the remaining material
decision; do not invent a policy boundary.

## 2. Establish evidence and a clean starting point

1. Record the current branch and worktree state. Do not attribute existing
   changes or signals to the proposal.
2. Run Better TypeScript on the relevant project with the exact command,
   project root, `tsconfig.json`, and optional `better-typescript.config.ts`.
   Preserve the relevant emitted blocks, including rule/advice name, location,
   message, hint, remediation, and evidence.
3. Before a future TypeScript implementation begins, establish the required
   clean self-hosting baseline with `timeout 10 npm run dev`; its initial report
   must be `No signals`. If it is not clean, flag that as an implementation
   blocker rather than silently absorbing unrelated findings.

When a project-specific configuration is relevant, distinguish the built-in
preset from that project's explicit wiring. Better TypeScript intentionally has no
per-check options, severities, or suppressions.

## 3. Locate the owning behavior

Read the check modules in `src/checks/`, especially each check's emitted message
and hint, then inspect the closest matcher and its fixture/test. Search by domain
concept as well as by rule name so an existing rule is not duplicated.

Determine whether the behavior comes from:

- a local reported `Check`;
- a silent evidence check;
- aggregate `Advice` in `defaultDerive`; or
- a configuration choice.

Read 2–3 closest check implementations and the corresponding examples in
`@repos/effect/` before proposing TypeScript changes. Preserve type, import,
first-party/external, ambient, and other semantic boundary facts from the real
example; textual resemblance alone is not enough.

Also audit overlap and derivation effects. Checks must not depend on one another;
cross-check interpretation belongs in `defaultDerive`. A change in a reported
rule's count, locations, visibility, or name can change density, dominance,
hot-subsystem, collision, and systemic advice.

## 4. Choose one remediation shape

Use this decision table and state the reason for the choice:

| Finding                                                                                              | Chosen action                                                     |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| The pattern is one local implementation and has no stable, reusable boundary.                        | Refactor the code; do not add a check.                            |
| The existing check owns the policy but matches too broadly, narrowly, or unclearly.                  | Update that check and its boundary tests.                         |
| The pattern is stable, broadly useful, mechanically recognizable, and has an actionable replacement. | Add a narrowly scoped check.                                      |
| Two checks express the same policy or one is obsolete.                                               | Merge or delete the obsolete check and migrate intended coverage. |
| The local checks are correct but their combined presentation is wrong.                               | Change derived advice or its threshold/evidence.                  |
| The policy belongs only to one project.                                                              | Keep the preset unchanged; use explicit project wiring.           |

A default check must have a clear rationale, a predictable boundary, and an
actionable hint. Otherwise, prefer a refactor or an investigation plan.

## 5. Specify executable acceptance criteria

Turn the actual example into a compiling fixture before implementation:

- `tests/fixtures/<check-name>/src/cases.ts` contains every must-report case;
- `tests/fixtures/<check-name>/src/allowed.ts` contains close must-not-report
  boundaries; and
- extra fixture files preserve type or module context when necessary.

Specify exact expected locations, messages, and hints. The direct check test
must assert the complete detection set, not only the desired detection. If the
proposal changes advice, define the advice title, remediation/evidence, and the
threshold boundary in an advice/default-derive test.

## 6. Write the file-level implementation plan

For each action, name the expected files and responsibility:

- **Add a reported check:** `src/checks/<name>.ts`, the barrel export,
  `namedCheck("<kebab-name>", ...)` in `src/preset/defaultWiring.ts`, fixture,
  and focused test.
- **Add evidence-only behavior:** use `silentCheck(...)`; update derivation and
  its tests instead of rendering a local block.
- **Update a check:** change only its matcher, detection location, message,
  hint, or exemptions required by the stated policy; update its fixture/test.
- **Delete or merge:** remove the module, barrel export, preset entry, tests,
  fixtures, documentation, and any stale `signalOf(...)` lookup. Move retained
  coverage to the replacement check.
- **Change derived advice:** modify `defaultDerive` or the advice module; do
  not add check-to-check dependencies.

Audit public behavior explicitly. Rule name, message, and hint form a local
report/watch identity; advice level, path, and title form advice identity. A
rename, rewording, deletion, or reported/silent change is a deliberate
compatibility decision and needs affected report, CLI, and watch tests.

## 7. Define verification and handoff

List verification in this order:

1. Focused check or advice test.
2. Fixture compilation.
3. Affected default-derive, report, CLI, and watch tests.
4. `npm test`.
5. `npm run typecheck`.
6. `npm run format:check`.
7. `npm run build`.
8. `timeout 10 npm run dev`, beginning at `No signals`.
9. `npm run bench` when the change affects rule performance or the full
   verification bar is requested.

Leave changes uncommitted on the current branch unless the maintainer explicitly
requests a commit.

## Required response format

Return a concise plan with exactly these sections:

```text
## Policy decision

## Evidence and boundaries

## Chosen remediation

## Planned changes

## Regression coverage

## Compatibility and non-goals

## Verification

## Open decisions
```

Be concrete about names, source files, tests, and acceptance criteria. If the
evidence supports a refactor rather than a linter change, say so plainly.
