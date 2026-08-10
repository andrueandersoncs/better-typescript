# 11 — Infer singleton Semantic Modules through the snapshot seam

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Introduce the final matcher-side Semantic Module snapshot interface and make
basic eligible declarations observable as deterministic singleton Semantic Modules through its pure
queries.

**Blocked by:** 10 — Scope matcher planning to active Program sources.

**Status:** done

- [x] `SemanticModuleSnapshotV1` exposes exactly the final five top-level collections: entities,
      modules, accepted bonds, suppressed bonds, and exclusions.
- [x] Basic top-level functions, classes, interfaces, type aliases, and enums normalize to one
      entity each and one singleton Semantic Module each.
- [x] Entity keys use Program-scoped workspace-relative POSIX path, family-anchor start/end, and
      SyntaxKind; ordering is canonical and display names are metadata only.
- [x] Snapshot JSON contains no compiler objects, absolute paths, mutable collections, caches, or
      implementation representatives.
- [x] `moduleFor`, `peersFor`, and `proofBetween` satisfy singleton, self, cross-module, and
      unknown-key behavior without rescanning TypeScript.
- [x] Human-authored typed fixture manifests resolve every selector exactly once and label every
      observed entity exactly once.
- [x] Focused snapshot tests and the full suite pass; formatting and self-hosting are clean; the
      benchmark remains below 100ms.

## Answer

The implementation was already present at resolution time. `semanticModuleEngine` exposes the
immutable five-collection `SemanticModuleSnapshotV1`, deterministic basic-declaration singleton
normalization, and pure `moduleFor`, `peersFor`, and `proofBetween` queries. The typed singleton
fixture manifest proves exact selector resolution and complete observed-entity labeling.

Verification passed: 20 focused Semantic Module tests, repository typechecking, 673 full-suite
tests, formatting, and self-hosting with no signals. The benchmark mean was 66.733ms.
