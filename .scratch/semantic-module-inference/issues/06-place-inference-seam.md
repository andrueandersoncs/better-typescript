# Place the Semantic Module inference seam

Type: grilling Status: resolved Blocked by: 05

## Question

Where should the deep inference seam live across matcher evidence, Policies, Signals, derive,
Wiring, and self-host configuration so callers learn one small interface, Program work is shared,
and every new check and Advice path is enabled by default?

## Answer

The external seam lives in `packages/matchers`: one deep Semantic Module module owns
`SemanticModuleSnapshotV1`, its builder, the three settled pure queries, and the
`semanticModulePlacement` matcher. Snapshot normalization, Hard Bond evaluation, partitioning, and
proof construction remain private implementation.

Core makes one generic scope correction. `Matcher.plan` receives a `ProgramMatchContext` containing
the existing Program context plus `sourceFiles`: exactly the project source files included for that
matcher by Wiring. `runMatchers` computes that list from its existing project-source filter and
per-matcher inclusion predicate. The snapshot builder consumes only this list, so explicitly
glob-excluded sources never participate. Per-file `MatchContext` and Wiring's public data model do
not change.

`packages/guidance` exposes one `semanticModulePlacement` Policy factory. Its explicit immutable
Paradigm Hard Bond rule catalog is passed to the matcher; each architecture preset owns its catalog
and instantiates exactly one Policy. The neutral, OOP, and FP catalogs are all empty initially. No
global registration or Semantic Module field is added to Wiring.

The matcher constructs one immutable snapshot when its plan is created for a Program and Wiring
scope, closes its subscriptions over that snapshot, emits every placement mismatch, and releases the
snapshot after matching. There is no mutable cache or engine evidence registry. One Policy and
duplicate Policy-name validation guarantee one construction per configured scope.

The matcher emits tagged mismatch projections through the existing pipeline:

`Match` → Policy `Detection` → one named `Signal` → Architecture Explore adviser → `Advice`.

Each projection carries the exact entity keys, relevant sorted membership, Physical Module paths,
and referenced proof or bond evidence needed to audit that mismatch. The complete Program snapshot
does not cross the Signal seam, and aggregate counts are not a substitute for evidence. “Prototype
Physical Module mismatch Advice” owns the exact projection tags, locations, messages, deduplication,
raw-Detection reporting choice, and rendered Advice.

All Architecture Explore presets include this Policy and adviser. Existing self-host
`architectureExploreWiring` scope therefore enables the full path for the config, every package
source, and tests; the benchmark's Architecture Explore Wiring measures it. It is not added to
baseline `defaultWiring`.
