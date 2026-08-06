# Design the Semantic Module evidence interface

Type: grilling Status: resolved Blocked by: 04, 09

## Question

What is the smallest reusable matcher-side interface and serialized evidence contract that gives any
Code Entity its exact Semantic Module peers and explanation, with stable identity and ordering and
without repeating TypeScript Program scans?

## Answer

The canonical matcher-side artifact is an immutable `SemanticModuleSnapshotV1`. Construct it once
from one Program's normalized Code Entities and selected Hard Bond rules; every consumer then uses
pure snapshot queries:

- `moduleFor(snapshot, entityKey)` returns the entity's complete `SemanticModuleRecord`.
- `peersFor(snapshot, entityKey)` returns its other members in entity-key order. A singleton returns
  an empty array.
- `proofBetween(snapshot, leftKey, rightKey)` returns the ordered forest path from left to right.
  Known self-membership returns an empty proof; an unknown key or different Semantic Modules return
  no proof.

`SemanticModuleSnapshotV1` is versioned public JSON with exactly these top-level collections:

- `entities`: normalized entity evidence, sorted by the settled Program-scoped `EntityKey`. Each
  record carries its declaration-family anchors, production/test stratum, and display metadata.
- `modules`: records ordered by first member key. Each contains sorted member keys and the keys of
  its canonical explanation-forest bonds. A Semantic Module has no separate id and never exposes a
  disjoint-set representative.
- `acceptedBonds`: every accepted candidate in canonical tuple order, including bonds redundant
  after closure. The forest references the subset retained by the settled algorithm.
- `suppressedBonds`: every rejected candidate in canonical tuple order together with its typed
  Partition Barrier reason.
- `exclusions`: candidate declaration anchors and typed normalization-exclusion reasons, sorted by
  anchor key. Sources outside Wiring scope remain absent rather than appearing as exclusions.

The `EntityKey` is the settled workspace-relative POSIX path, anchor `getStart()`, `getEnd()`, and
`SyntaxKind` serialization. Snapshot scope supplies Program identity; consumers must not merge keys
from separately constructed snapshots. A bond key is the canonical ordered endpoint keys, stable
rule id, and evidence key. Every bond carries schema-validated tagged evidence owned and versioned
by its rule. Evidence contains resolved witnesses and every closed-world premise needed for replay;
human prose is rendered from it and is never stored as evidence.

The JSON contains no `ts.Program`, `ts.Node`, `ts.Symbol`, maps, sets, absolute paths,
object-identity references, caches, or implementation representatives. All nested anchors,
endpoints, witnesses, premises, bond references, and proof steps use their canonical orders. A proof
step references one accepted forest bond; traversal direction comes from the requested left-to-right
path while the stored bond endpoints remain canonical.

Construction owns the only Program and TypeChecker traversal needed for this evidence. Query helpers
read only the snapshot and may build no hidden mutable proof cache. The later seam-placement
decision owns snapshot lifetime and Wiring integration, not this data contract.
