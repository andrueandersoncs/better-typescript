# 01 — Extract the pure route plan

**Specification:** [Declarative semantic review](../spec.md)

Status: ready-for-agent

## What to build

Extract a pure, internal route-plan constructor from `routeRuleHunks`.

The plan must contain the complete known domain → path → hunk candidate tree, including recursive
bucket structure for oversized Choice sets. It is a declaration of possible routing work, not an
execution result.

Keep the interface concrete and package-private. Prefer one `routePlan` value and one
`buildRoutePlan(rule, diffFiles)` constructor over a general planning framework.

## Acceptance criteria

- [ ] `buildRoutePlan` accepts only deterministic inputs and performs no evaluator, network,
      repository, clock, or environment access.
- [ ] The plan contains every eligible domain, matching path, hunk, synthetic hunk, candidate id,
      description, and recursive bucket needed by current routing.
- [ ] Source-scope filtering, glob matching, input ordering, and candidate descriptions preserve
      current behavior.
- [ ] Plan data is inspectable without running an interpreter and contains no callbacks.
- [ ] A narrow test proves the complete tree is built before any evaluator can run.
- [ ] Existing routing execution remains in place for ticket 02; this ticket changes declaration,
      not behavior.
- [ ] `./scripts/check.sh` passes.

## Non-goals

- Executing the plan.
- Changing routing choices, beam scoring, or request limits.
- Adding generic Applicative, Selective, or Monad interfaces.
- Exporting the plan outside `internal/semanticlint`.
