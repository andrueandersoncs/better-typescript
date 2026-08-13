# 14 — Prove deterministic Semantic Module membership

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Make every same-module result reproducible and auditable through canonical bond
evidence, a deterministic explanation forest, exact portable JSON, and Membership Proof queries.

**Blocked by:** 13 — Close same-symbol Hard Bonds with Partition Barriers.

**Status:** done

- [x] Candidate bonds canonicalize by ordered endpoints, stable rule id, and evidence key before
      closure; duplicate tuples coalesce.
- [x] Canonically ordered union retains a forest bond only when it joins components, while all
      accepted redundant bonds remain in audit evidence.
- [x] `proofBetween` returns the unique directed forest path, an empty self-proof, and no proof for
      unknown or cross-module keys.
- [x] Every bond carries schema-validated tagged replay evidence with resolved witnesses and all
      closed-world premises; prose is rendered, not stored.
- [x] The rule interface requires each rule's evidence schema, admits only independently proven
      pairs from normalized current-Program semantic facts, and supports explicit immutable
      catalogs.
- [x] The neutral reference-graph rules land separately after this generic proof seam; the
      object-oriented and functional catalogs remain empty.
- [x] Focused cases assert exact snapshot JSON, including every key, anchor, stratum, collection,
      bond reference, exclusion, and nested canonical order.
- [x] Byte-identity tests permute source, entity, rule, and candidate enumeration plus duplicate
      emission without changing snapshots or queries.
- [x] Label-remapped tests cover names, whitespace/comments, and eligible relocation while
      preserving equivalent membership and proof structure.
- [x] Focused proof tests and the full suite pass; formatting and self-hosting are clean; the
      benchmark remains below 100ms.

## Comments

### 2026-08-13 — Verified complete

The current snapshot, placement matcher, and Advice implementation satisfy every acceptance item.
Verification passed: 38 focused Semantic Module tests, 691 full-suite tests, an empty `bun run dev`
report, and a 66.079ms benchmark.
