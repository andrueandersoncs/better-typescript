# 13 — Close same-symbol Hard Bonds with Partition Barriers

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Infer strict Semantic Module membership from canonical same-symbol Hard Bonds
while preventing ineligible, cross-Program, and production/test relationships from affecting
closure.

**Blocked by:** 12 — Normalize every Code Entity family.

**Status:** ready-for-agent

- [ ] Every canonical non-alias checker symbol with multiple distinct eligible owners emits
      deterministic pairwise candidate bonds; exact duplicates coalesce.
- [ ] Alias resolution only finds declaration-owning symbols; overload and binding normalization
      never emits self-bonds.
- [ ] Eligibility and production/test stratum assignment precede closure, using the existing test
      classifier including benchmark sources.
- [ ] Barrier-crossing candidates become typed, ordered suppressed bonds and never merge, prove, or
      mediate membership.
- [ ] Accepted bonds produce the least connected-component partition, preserving singleton entities
      and canonical module/member ordering.
- [ ] Calls, construction, type use, inheritance, implementation, decorators, initializers, ordinary
      references, and cycles remain non-bonding dependencies.
- [ ] Fixtures prove duplicate coalescing, production/test suppression, Program isolation,
      excluded-source absence, package non-barriers, dependencies, and cycles.
- [ ] Controlled-change tests prove that crossing a stratum splits membership while adding
      references does not change it.
- [ ] Focused partition tests and the full suite pass; formatting and self-hosting are clean; the
      benchmark remains below 100ms.
