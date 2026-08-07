# 14 — Prove deterministic Semantic Module membership

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Make every same-module result reproducible and auditable through canonical bond
evidence, a deterministic explanation forest, exact portable JSON, and Membership Proof queries.

**Blocked by:** 13 — Close same-symbol Hard Bonds with Partition Barriers.

**Status:** ready-for-agent

- [ ] Candidate bonds canonicalize by ordered endpoints, stable rule id, and evidence key before
      closure; duplicate tuples coalesce.
- [ ] Canonically ordered union retains a forest bond only when it joins components, while all
      accepted redundant bonds remain in audit evidence.
- [ ] `proofBetween` returns the unique directed forest path, an empty self-proof, and no proof for
      unknown or cross-module keys.
- [ ] Every bond carries schema-validated tagged replay evidence with resolved witnesses and all
      closed-world premises; prose is rendered, not stored.
- [ ] The rule interface requires each rule's evidence schema, admits only independently proven
      pairs from normalized current-Program semantic facts, and supports explicit immutable
      catalogs.
- [ ] The neutral reference-graph rules land separately after this generic proof seam; the
      object-oriented and functional catalogs remain empty.
- [ ] Focused cases assert exact snapshot JSON, including every key, anchor, stratum, collection,
      bond reference, exclusion, and nested canonical order.
- [ ] Byte-identity tests permute source, entity, rule, and candidate enumeration plus duplicate
      emission without changing snapshots or queries.
- [ ] Label-remapped tests cover names, whitespace/comments, and eligible relocation while
      preserving equivalent membership and proof structure.
- [ ] Focused proof tests and the full suite pass; formatting and self-hosting are clean; the
      benchmark remains below 100ms.
