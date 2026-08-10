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

- [Define paradigm-specific Hard Bond policy](issues/09-define-paradigm-hard-bonds.md) — Paradigm
  rules require semantic necessity and replayable evidence; its initially empty-catalog decision is
  superseded by the first proven neutral rules below.

- [Define the initial paradigm Hard Bond catalog](issues/18-define-initial-hard-bond-catalog.md) —
  Canonical reference SCCs are atomic, and a component with one complete Program-closed-world
  consumer is exclusively owned; both neutral rules carry typed replay evidence.

- [Design the Semantic Module evidence interface](issues/05-design-semantic-module-evidence-interface.md)
  — A versioned immutable Program snapshot carries the complete canonical audit record; pure queries
  return exact membership and forest-derived proofs without rescanning TypeScript.

- [Place the Semantic Module inference seam](issues/06-place-inference-seam.md) — One Wiring-scoped
  matcher builds a plan-local snapshot and sends exact tagged mismatch evidence through one
  Architecture Explore Policy, Signal, and adviser without a core evidence registry.

- [Prototype Physical Module mismatch Advice](issues/07-prototype-mismatch-advice.md) — Silent
  tagged mismatch projections drive exact file-level mixed and canonically anchored split Advice,
  with complete ordered membership and no implied destination or move direction.

- [Specify the validation oracle](issues/08-specify-validation-oracle.md) — Layered typed fixtures,
  exact mismatch outputs, metamorphic invariants, clean self-hosting, and the existing sub-100ms
  benchmark form the complete proof.

- [Infer neutral reference-graph Hard Bonds](issues/19-infer-reference-graph-hard-bonds.md) — The
  neutral catalog carries a third law, `semantic-subject-ownership`: an operation whose parameters
  are all one first-party data declaration and whose result is a boolean verdict belongs to that
  subject, and a value helper inherits the subject of the single subject-owned operation its
  initializer calls. `exclusive-consumer-ownership` is version 2 and withholds a bond when consumer
  and target carry disjoint subjects. See ADR-0025.

## Not yet specified

- None.

## Out of scope

- Implementing the production checks, guidance, or automatic refactors.
- Choosing filenames, destination paths, or move direction for a Semantic Module.
- Heuristic grouping from names, comments, paths, co-change history, repository ownership metadata,
  runtime traces, scores, or thresholds.
- Semantic simplification, inlining, or reducing the number of Code Entities.
