---
description: Turn a maintainer-observed code pattern into a concrete remediation plan
argument-hint: <pattern, file path, or Better TypeScript output>
---

Turn the following maintainer observation into a concrete Better TypeScript remediation plan:

$ARGUMENTS

This is a planning command. Do not implement the plan, modify TypeScript, alter the preset, or
commit changes unless the maintainer explicitly asks for that in a later request.

## Goal

Start from: “I do not like this code pattern in code Better TypeScript was applied to.” End with a
small, reviewable plan that chooses deliberately among:

- adding a check;
- updating a check;
- deleting or merging checks;
- changing derived advice;

## 1. Establish the candidate policy

Turn the observation into a precise proposed invariant. Capture:

- a minimal example of the disliked pattern;
- the desired replacement or desired code shape;
- why it is undesirable;
- the closest similar examples that must remain allowed;

If the input does not contain enough information to state the invariant, inspect the cited code first. Ask only for the remaining material decision; do not invent a policy boundary.

## 2. Locate the owning behavior

Read the relevant Policy definitions in `packages/guidance/src/` and their Matchers in
`packages/matchers/src/`. Inspect each Policy's Detection message and hint, then its Matcher and
example/test coverage. Search by domain concept and Policy name so existing ownership is not
duplicated.

Determine whether the behavior comes from:

- a reported Policy that emits visible Detections;
- a silent Policy that supplies derivation evidence;
- Advice emitted by the owning `derive` function, including `defaultDerive`; or
- a Wiring configuration choice.

Read 2–3 closest Policy, Matcher, and derivation implementations before proposing TypeScript changes.

Also audit overlap and derivation effects. Policies must not depend on one another; cross-Policy
interpretation belongs in the owning `derive` function. Changing a Policy's Detection count,
locations, reported state, or name can change Signals and therefore density, dominance,
hot-subsystem, collision, and systemic Advice.

## 3. Choose one remediation shape

Use this decision table and state the reason for the choice:

| Finding                                                                                              | Chosen action                                                     |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| The pattern is one local implementation and has no stable, reusable boundary.                        | Refactor the code; do not add a check.                            |
| The existing check owns the policy but matches too broadly, narrowly, or unclearly.                  | Update that check and its boundary tests.                         |
| The pattern is stable, broadly useful, mechanically recognizable, and has an actionable replacement. | Add a narrowly scoped check.                                      |
| Two checks express the same policy or one is obsolete.                                               | Merge or delete the obsolete check and migrate intended coverage. |
| The local checks are correct but their combined presentation is wrong.                               | Change derived advice or its threshold/evidence.                  |
| The policy belongs only to one project.                                                              | Keep the preset unchanged; use explicit project wiring.           |

A default check must have a clear rationale, a predictable boundary, and an actionable hint.
Otherwise, prefer a refactor or an investigation plan.

## 4. Specify executable acceptance criteria

Turn the actual example into a compiling fixture before implementation:

- `tests/fixtures/<check-name>/src/cases.ts` contains every must-report case;
- `tests/fixtures/<check-name>/src/allowed.ts` contains close must-not-report boundaries; and
- extra fixture files preserve type or module context when necessary.

Specify exact expected locations, messages, and hints. The direct check test must assert the
complete detection set, not only the desired detection. If the proposal changes advice, define the
advice title, remediation/evidence, and the threshold boundary in an advice/default-derive test.

## 5. Write the file-level implementation plan

For each action, name the expected files and responsibility:

- **Add a reported check:** `src/checks/<name>.ts`, the barrel export,
  `namedCheck("<kebab-name>", ...)` in `src/preset/defaultWiring.ts`, fixture, and focused test.
- **Add evidence-only behavior:** use `silentCheck(...)`; update derivation and its tests instead of
  rendering a local block.
- **Update a check:** change only its matcher, detection location, message, hint, or exemptions
  required by the stated policy; update its fixture/test.
- **Delete or merge:** remove the module, barrel export, preset entry, tests, fixtures,
  documentation, and any stale `signalOf(...)` lookup. Move retained coverage to the replacement
  check.
- **Change derived advice:** modify `defaultDerive` or the advice module; do not add check-to-check
  dependencies.

Audit public behavior explicitly. Rule name, message, and hint form a local report/watch identity;
advice level, path, and title form advice identity. A rename, rewording, deletion, or
reported/silent change is a deliberate compatibility decision and needs affected report, CLI, and
watch tests.

## 6. Define verification and handoff

List verification in this order:

1. Focused check or advice test.
2. Fixture compilation.
3. Affected default-derive, report, CLI, and watch tests.
4. `bun run test`.
5. `bun run typecheck`.
6. `bun run format:check`.
7. `bun run build`.
8. `bun run dev`, beginning at `No signals`.
9. `bun run bench` when the change affects rule performance or the full verification bar is
   requested.

Leave changes uncommitted on the current branch unless the maintainer explicitly requests a commit.

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

Be concrete about names, source files, tests, and acceptance criteria. If the evidence supports a
refactor rather than a linter change, say so plainly.
