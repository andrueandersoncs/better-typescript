# 15 — Emit exact Physical Module placement mismatches

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Turn one scoped Semantic Module snapshot into exact silent typed Detections for
every split Semantic Module and mixed Physical Module, without leaking the complete Program
snapshot.

**Blocked by:** 14 — Prove deterministic Semantic Module membership.

**Status:** done

- [x] The `semanticModulePlacement` matcher builds one immutable snapshot per Program and Wiring
      scope, closes subscriptions over it, and keeps no global or mutable cache.
- [x] Its Policy factory accepts an explicit immutable paradigm rule catalog and emits the silent
      `semantic-module-placement` Signal.
- [x] `split-semantic-module` emits exactly once per multi-file Semantic Module at the canonical
      first member's declaration anchor.
- [x] `mixed-physical-module` emits exactly once per file containing multiple Semantic Modules at
      file position 1:1.
- [x] Every projection contains complete ordered entity records, ordered Physical Module paths, and
      canonical forest bonds with replay evidence for only the relevant modules.
- [x] Projection messages and hints exactly match the specification and never imply a destination or
      move direction.
- [x] Clean, split-only, mixed-only, overlap, shared-anchor, ordering, deduplication, and
      placement-only change fixtures assert the full typed Detection contract.
- [x] Focused matcher/Policy tests and the full suite pass; formatting and self-hosting are clean;
      the benchmark remains below 100ms.

## Comments

### 2026-08-13 — Verified complete

The current snapshot, placement matcher, and Advice implementation satisfy every acceptance item.
Verification passed: 38 focused Semantic Module tests, 691 full-suite tests, an empty `bun run dev`
report, and a 66.079ms benchmark.
