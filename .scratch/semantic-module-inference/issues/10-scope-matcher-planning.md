# 10 — Scope matcher planning to active Program sources

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Give every Program-stage matcher plan the exact first-party source files included
for that matcher by the active Wiring entry. Preserve existing per-file matching and make scope
exclusion observable at the planning seam.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] The Program planning context adds `sourceFiles` without changing per-file MatchContext or
      Wiring's public data model.
- [x] Each matcher receives only sources passing both the existing first-party predicate and that
      matcher's inclusion predicate.
- [x] A matcher with no included source does not plan; multiple matchers with different scopes
      receive different exact source lists.
- [x] Existing matchers migrate cleanly to the new planning context with no compatibility alias or
      duplicate context type.
- [x] Focused scope tests and the full suite pass; formatting and self-hosting are clean; the
      benchmark remains below 100ms.

## Answer

`ProgramMatchContext` adds the matcher-local `sourceFiles` scope while `MatchContext` and Wiring
remain unchanged. `runMatchers` filters Program sources first through `isProjectSourceFile`, then
through each matcher inclusion predicate, and skips planning for empty scopes.
`matcherPlanningContext.test.ts` proves distinct exact scopes and empty-scope suppression. The
focused test, typecheck, and 673-test suite pass; self-hosting emits no signals; the benchmark mean
is 68.295ms.
