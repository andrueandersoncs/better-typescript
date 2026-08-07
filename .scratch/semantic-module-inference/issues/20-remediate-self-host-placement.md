# 20 — Remediate self-host Semantic Module placement

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Apply the completed placement analysis to this repository until every configured
source satisfies its inferred Semantic Module partition without suppressions or layout-derived
bonds.

**Blocked by:** 16 — Render Semantic Module placement Advice; 19 — Infer neutral Semantic Reference
Graph Hard Bonds.

**Status:** ready-for-agent

- [ ] Run the complete self-host Wiring over configuration, every package source, and tests after
      the neutral reference-graph rules land; capture the exact remaining split and mixed Advice.
- [ ] Resolve every mismatch by relocating complete Semantic Modules. Never split membership, infer
      a destination from a reporting anchor, or encode current paths/co-location into a Hard Bond
      rule.
- [ ] Preserve runtime behavior, TypeScript semantics, package exports, and public interfaces.
      Update every import/reference with language-server refactors where available.
- [ ] Keep this placement-only: do not inline, delete, merge, or otherwise reduce Code Entities
      merely to silence Advice.
- [ ] Add no allowlist, baseline, suppression, ignored self-host path, score, threshold, or
      repository-specific paradigm rule.
- [ ] Self-host output is empty with the placement Policy and adviser enabled exactly once in every
      Architecture Explore preset.
- [ ] Focused Semantic Module tests and the full suite pass; formatting is clean; the warmed
      benchmark records its observed mean strictly below 100ms.
