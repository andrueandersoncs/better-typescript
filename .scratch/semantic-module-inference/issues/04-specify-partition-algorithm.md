# Specify the partition and explanation algorithm

Type: grilling Status: resolved Blocked by: 01, 02, 03

## Question

Given normalized Code Entities, hard bonds, and absolute barriers, what exact order-independent
fixed-point algorithm produces the strict partition and an auditable bond chain for every
same-module result, including conflicting bond/barrier cases?

## Answer

Semantic Module membership is the least equivalence relation containing every accepted Hard Bond.
Compute it once per Program as deterministic connected components:

1. Sort eligible Code Entities by their serialized entity key. Every entity enters the result,
   including entities with no bonds.
2. Canonicalize each candidate bond as `(lowerEntityKey, higherEntityKey, ruleId, evidenceKey)`.
   Rules emit a set keyed by that tuple; exact duplicate emissions coalesce.
3. Before closure, classify every candidate. A bond is accepted only when both endpoints are eligible
   entities in the same Program and production/test stratum. Otherwise retain it as suppressed-bond
   evidence with its barrier reason. Sort accepted and suppressed bonds by the canonical tuple.
4. Visit accepted bonds in that order with a disjoint-set structure. Union their endpoint
   components. Retain a bond in the explanation forest exactly when that union joins two previously
   distinct components; discard accepted bonds that are redundant after earlier unions.
5. Materialize each resulting component with members sorted by entity key. Order Semantic Modules by
   their first member key. Do not expose the disjoint-set representative as identity.

The explanation forest is canonical because candidate order is canonical. The Membership Proof for
two distinct entities in one Semantic Module is the unique forest path from the requested entity to
its peer, with each edge carrying its Hard-Bond rule and evidence. Self-membership has an empty
proof. Entities in different Semantic Modules have no Membership Proof.

Barrier classification always precedes union. A suppressed bond never joins components, enters a
proof, or mediates a transitive merge, regardless of where it sorts or whether an accepted path
exists elsewhere. With the settled Program and production/test strata, every accepted path remains
inside one stratum.

This is the fixed point: the connected components are exactly the least partition closed under
accepted Hard Bonds. Membership, module ordering, the explanation forest, Membership Proofs, and
suppressed evidence are invariant under AST visitation, rule registration, and input enumeration
order when the normalized entity and candidate-bond sets are unchanged.
