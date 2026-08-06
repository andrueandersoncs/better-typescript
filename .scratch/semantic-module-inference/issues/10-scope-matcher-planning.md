# 10 — Scope matcher planning to active Program sources

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Give every Program-stage matcher plan the exact first-party source files included
for that matcher by the active Wiring entry. Preserve existing per-file matching and make scope
exclusion observable at the planning seam.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The Program planning context adds `sourceFiles` without changing per-file MatchContext or
      Wiring's public data model.
- [ ] Each matcher receives only sources passing both the existing first-party predicate and that
      matcher's inclusion predicate.
- [ ] A matcher with no included source does not plan; multiple matchers with different scopes
      receive different exact source lists.
- [ ] Existing matchers migrate cleanly to the new planning context with no compatibility alias or
      duplicate context type.
- [ ] Focused scope tests and the full suite pass; formatting and self-hosting are clean; the
      benchmark remains below 100ms.
