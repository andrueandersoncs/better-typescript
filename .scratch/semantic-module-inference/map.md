# Specify Semantic Module inference

Label: wayfinder:map

## Destination

An implementation-ready spec for deterministic semantic-AST inference of Semantic Modules, including
reusable evidence, Physical Module mismatch Advice, and complete proof criteria for
`packages/matchers` and `packages/guidance`.

## Notes

- Domain: Better TypeScript architecture analysis. Consult `CONTEXT.md`, `/domain-modeling`, and
  `/codebase-design` in every session.
- Partition first-party top-level Code Entities per TypeScript Program, with production and test
  sources in separate partitions.
- Membership is placement-independent, explainable hard-rule closure over TypeChecker-resolved
  semantic AST relationships; singleton Semantic Modules are valid.
- Advice reports exact membership and mismatches but does not choose destination paths or move
  directions.
- Require expected-partition fixtures, metamorphic invariants, clean self-host output, and the
  existing sub-100ms benchmark.
- Planning only: production implementation begins after this map reaches its destination.

## Decisions so far

- [Normalize Code Entity identity](issues/01-normalize-code-entity-identity.md) — Code Entities are
  Program-scoped movable declaration families with source-anchor identities, explicit overload,
  binding, merge, namespace, default-export, alias, and exclusion rules.

- [Define Semantic Module partition barriers](issues/02-define-partition-barriers.md) — Programs are
  independent and production/test is the only eligible-entity stratum; ambient and explicitly
  glob-excluded sources do not participate, while package and composition-root roles add no barrier.

- [Prototype hard Semantic Module bonds](issues/03-prototype-hard-membership-bonds.md) — Shared
  canonical checker-symbol ownership is the only neutral Hard Bond; references and cycles remain
  dependencies, so cross-file bonds require explicit paradigm policy.

- [Specify the partition and explanation algorithm](issues/04-specify-partition-algorithm.md) —
  Canonically sorted accepted Hard Bonds form connected components and a deterministic spanning
  forest whose unique paths prove membership; barrier-crossing bonds remain suppressed evidence.

- [Define paradigm-specific Hard Bond policy](issues/09-define-paradigm-hard-bonds.md) — The initial
  catalog is empty; future preset-owned rules require semantic necessity and replayable evidence.

- [Design the Semantic Module evidence interface](issues/05-design-semantic-module-evidence-interface.md)
  — A versioned immutable Program snapshot carries the complete canonical audit record; pure queries
  return exact membership and forest-derived proofs without rescanning TypeScript.

- [Place the Semantic Module inference seam](issues/06-place-inference-seam.md) — One
  Wiring-scoped matcher builds a plan-local snapshot and sends exact tagged mismatch evidence
  through one Architecture Explore Policy, Signal, and adviser without a core evidence registry.

- [Prototype Physical Module mismatch Advice](issues/07-prototype-mismatch-advice.md) — Silent tagged
  mismatch projections drive exact file-level mixed and canonically anchored split Advice, with
  complete ordered membership and no implied destination or move direction.

- [Specify the validation oracle](issues/08-specify-validation-oracle.md) — Layered typed fixtures,
  exact mismatch outputs, metamorphic invariants, clean self-hosting, and the existing sub-100ms
  benchmark form the complete proof.

## Not yet specified

- None.

## Out of scope

- Implementing the production checks, guidance, or automatic refactors.
- Choosing filenames, destination paths, or move direction for a Semantic Module.
- Heuristic grouping from names, comments, paths, co-change history, ownership, runtime traces,
  scores, or thresholds.
