# 12 — Normalize every Code Entity family

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Complete Code Entity normalization so every settled TypeScript declaration
family, alias case, and exclusion is represented exactly through the snapshot seam.

**Blocked by:** 11 — Infer singleton Semantic Modules through the snapshot seam.

**Status:** ready-for-agent

- [ ] One variable declaration is one entity; recursively bound leaf symbols belong to it in source
      order while keys, omissions, and initializer references remain evidence only.
- [ ] Same-symbol function declarations in one Physical Module form one overload entity; other legal
      merge and repeated declaration contributions remain separate ordered entities.
- [ ] Outermost repeated and dotted namespaces normalize as separate contributions whose nested
      members remain owned evidence.
- [ ] Named and anonymous default classes/functions normalize with settled display metadata; default
      expressions and export assignments do not.
- [ ] Imports and exports remain edges; aliases resolve to declaration-owning symbols and never
      create entity identity.
- [ ] Ambient candidates are excluded as `ambient-declaration`; incoherent-symbol candidates are
      excluded as `missing-symbol` without synthetic identity.
- [ ] Sources outside matcher scope are absent rather than exclusions, and all entities, anchors,
      owned symbols, and exclusions use canonical order.
- [ ] Orthogonal fixtures cover every family and an isolated parser-recovery Program covers
      `missing-symbol`.
- [ ] Focused normalization tests and the full suite pass; formatting and self-hosting are clean;
      the benchmark remains below 100ms.
