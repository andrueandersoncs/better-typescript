# 11 — Infer singleton Semantic Modules through the snapshot seam

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Introduce the final matcher-side Semantic Module snapshot interface and make
basic eligible declarations observable as deterministic singleton Semantic Modules through its pure
queries.

**Blocked by:** 10 — Scope matcher planning to active Program sources.

**Status:** ready-for-agent

- [ ] `SemanticModuleSnapshotV1` exposes exactly the final five top-level collections: entities,
      modules, accepted bonds, suppressed bonds, and exclusions.
- [ ] Basic top-level functions, classes, interfaces, type aliases, and enums normalize to one
      entity each and one singleton Semantic Module each.
- [ ] Entity keys use Program-scoped workspace-relative POSIX path, family-anchor start/end, and
      SyntaxKind; ordering is canonical and display names are metadata only.
- [ ] Snapshot JSON contains no compiler objects, absolute paths, mutable collections, caches, or
      implementation representatives.
- [ ] `moduleFor`, `peersFor`, and `proofBetween` satisfy singleton, self, cross-module, and
      unknown-key behavior without rescanning TypeScript.
- [ ] Human-authored typed fixture manifests resolve every selector exactly once and label every
      observed entity exactly once.
- [ ] Focused snapshot tests and the full suite pass; formatting and self-hosting are clean; the
      benchmark remains below 100ms.
