# 13 — Close same-symbol Hard Bonds with Partition Barriers

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Infer strict Semantic Module membership from canonical same-symbol Hard Bonds
while preventing ineligible, cross-Program, and production/test relationships from affecting
closure.

**Blocked by:** 12 — Normalize every Code Entity family.

**Status:** done

- [x] Every canonical non-alias checker symbol with multiple distinct eligible owners emits
      deterministic pairwise candidate bonds; exact duplicates coalesce.
- [x] Alias resolution only finds declaration-owning symbols; overload and binding normalization
      never emits self-bonds.
- [x] Eligibility and production/test stratum assignment precede closure, using the existing test
      classifier including benchmark sources.
- [x] Barrier-crossing candidates become typed, ordered suppressed bonds and never merge, prove, or
      mediate membership.
- [x] Accepted bonds produce the least connected-component partition, preserving singleton entities
      and canonical module/member ordering.
- [x] Absent explicit catalog rules, calls, construction, type use, inheritance, implementation,
      decorators, initializers, ordinary references, and cycles remain non-bonding dependencies.
- [x] Fixtures prove duplicate coalescing, production/test suppression, Program isolation,
      excluded-source absence, package non-barriers, and ordinary non-bonding dependencies.
- [x] Controlled-change tests prove that crossing a stratum splits same-symbol membership while
      adding an ordinary acyclic reference does not change it.
- [x] Focused partition tests and the full suite pass; formatting and self-hosting are clean; the
      benchmark remains below 100ms.

## Comments

### 2026-08-13 — Verified complete

The current snapshot, placement matcher, and Advice implementation satisfy every acceptance item.
Verification passed: 38 focused Semantic Module tests, 691 full-suite tests, an empty `bun run dev`
report, and a 66.079ms benchmark.
