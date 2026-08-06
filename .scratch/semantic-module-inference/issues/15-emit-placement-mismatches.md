# 15 — Emit exact Physical Module placement mismatches

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Turn one scoped Semantic Module snapshot into exact silent typed Detections for
every split Semantic Module and mixed Physical Module, without leaking the complete Program
snapshot.

**Blocked by:** 14 — Prove deterministic Semantic Module membership.

**Status:** ready-for-agent

- [ ] The `semanticModulePlacement` matcher builds one immutable snapshot per Program and Wiring
      scope, closes subscriptions over it, and keeps no global or mutable cache.
- [ ] Its Policy factory accepts an explicit immutable paradigm rule catalog and emits the silent
      `semantic-module-placement` Signal.
- [ ] `split-semantic-module` emits exactly once per multi-file Semantic Module at the canonical
      first member's declaration anchor.
- [ ] `mixed-physical-module` emits exactly once per file containing multiple Semantic Modules at
      file position 1:1.
- [ ] Every projection contains complete ordered entity records, ordered Physical Module paths, and
      canonical forest bonds with replay evidence for only the relevant modules.
- [ ] Projection messages and hints exactly match the specification and never imply a destination or
      move direction.
- [ ] Clean, split-only, mixed-only, overlap, shared-anchor, ordering, deduplication, and
      placement-only change fixtures assert the full typed Detection contract.
- [ ] Focused matcher/Policy tests and the full suite pass; formatting and self-hosting are clean;
      the benchmark remains below 100ms.
