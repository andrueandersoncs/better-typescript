# 12 — Normalize every Code Entity family

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Complete Code Entity normalization so every settled TypeScript declaration
family, alias case, and exclusion is represented exactly through the snapshot seam.

**Blocked by:** 11 — Infer singleton Semantic Modules through the snapshot seam.

**Status:** done

- [x] One variable declaration is one entity; recursively bound leaf symbols belong to it in source
      order while keys, omissions, and initializer references remain evidence only.
- [x] Same-symbol function declarations in one Physical Module form one overload entity; other legal
      merge and repeated declaration contributions remain separate ordered entities.
- [x] Outermost repeated and dotted namespaces normalize as separate contributions whose nested
      members remain owned evidence.
- [x] Named and anonymous default classes/functions normalize with settled display metadata; default
      expressions and export assignments do not.
- [x] Imports and exports remain edges; aliases resolve to declaration-owning symbols and never
      create entity identity.
- [x] Ambient candidates are excluded as `ambient-declaration`; incoherent-symbol candidates are
      excluded as `missing-symbol` without synthetic identity.
- [x] Sources outside matcher scope are absent rather than exclusions, and all entities, anchors,
      owned symbols, and exclusions use canonical order.
- [x] Orthogonal fixtures cover every family and an isolated parser-recovery Program covers
      `missing-symbol`.
- [x] Focused normalization tests and the full suite pass; formatting and self-hosting are clean;
      the benchmark remains below 100ms.

## Comments

### 2026-08-13 — Verified complete

The current snapshot, placement matcher, and Advice implementation satisfy every acceptance item.
Verification passed: 38 focused Semantic Module tests, 691 full-suite tests, an empty `bun run dev`
report, and a 66.079ms benchmark.
