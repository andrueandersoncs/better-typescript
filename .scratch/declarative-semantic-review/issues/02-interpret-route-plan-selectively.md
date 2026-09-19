# 02 — Interpret the route plan selectively

**Specification:** [Declarative semantic review](../spec.md)

Status: ready-for-agent

Blocked by: 01

## What to build

Add the interpreter for the concrete route plan from ticket 01 and make `routeRuleHunks` use it.

The interpreter may conditionally evaluate known child branches, but it must not construct new route
branches from returned answers. Parent answers select among branches already present in the plan.

Remove the superseded request-construction path after the cutover.

## Acceptance criteria

- [ ] The interpreter receives `context.Context`, a complete route plan, model selection, and the
      existing evaluator dependency.
- [ ] Domain, path, hunk, and recursive bucket execution consume only nodes already in the plan.
- [ ] `none` choices, multi-candidate retention, joined probabilities, beam width, decision records,
      usage aggregation, and errors preserve current behavior.
- [ ] Existing selected hunks and routing decisions remain deterministic and canonically ordered.
- [ ] A narrow test proves an unselected branch is declared but not interpreted.
- [ ] Existing routing behavior tests continue to pass without weaker assertions.
- [ ] Obsolete mixed declaration/execution helpers are removed.
- [ ] `./scripts/check.sh` passes.

## Non-goals

- Relevance judgments or final policy evaluation.
- Speculative execution of every route branch.
- Public plan serialization.
- A general Selective abstraction.
