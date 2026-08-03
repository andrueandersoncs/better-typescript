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

## Not yet specified

- Special TypeScript relationships or declaration forms exposed by the membership prototype that
  require distinct policy decisions.
- Any paradigm-specific grouping policy exposed by the neutral evidence and integration design.

## Out of scope

- Implementing the production checks, guidance, or automatic refactors.
- Choosing filenames, destination paths, or move direction for a Semantic Module.
- Heuristic grouping from names, comments, paths, co-change history, ownership, runtime traces,
  scores, or thresholds.
