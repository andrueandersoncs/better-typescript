# Semantic Module inference

Status: ready-for-agent

## Problem Statement

Better TypeScript can analyze Physical Modules but cannot infer which top-level Code Entities
semantically belong together. Developers and coding agents therefore cannot reliably detect a
Semantic Module split across files or a Physical Module mixing unrelated Semantic Modules. Any
inference must be deterministic, placement-independent, explainable from TypeChecker-resolved facts,
scoped to the configured Program sources, and fast enough for self-hosting.

## Solution

Infer a strict Semantic Module partition for every configured TypeScript Program. Normalize eligible
Code Entities, accept only semantically necessary Hard Bonds, apply Partition Barriers before
closure, and preserve a canonical Membership Proof for every same-module result.

Expose the result as one immutable matcher-side snapshot with pure membership queries. Feed exact
split and mixed placement evidence through one silent Architecture Explore Signal and render
complete file-level Advice without choosing a destination or move direction.

## User Stories

1. As a developer, I want every eligible Code Entity assigned to exactly one Semantic Module, so
   that the result is a strict partition.
2. As a developer, I want singleton Semantic Modules preserved, so that unrelated declarations are
   never forced together.
3. As a developer, I want inference independent of current file placement, so that existing layout
   does not justify itself.
4. As a developer, I want production and test Code Entities kept separate, so that test helpers do
   not alter production membership.
5. As a monorepo maintainer, I want each TypeScript Program analyzed independently, so that project
   graphs do not leak identity or membership.
6. As a configuration author, I want only sources included by the active Wiring entry analyzed, so
   that excluded files cannot influence results.
7. As a developer, I want ambient and dependency declarations excluded, so that first-party
   architecture Advice is not polluted by declarations I do not own.
8. As a developer, I want functions, classes, interfaces, type aliases, enums, namespaces, and
   variables normalized consistently, so that inference covers ordinary TypeScript declarations.
9. As a developer, I want destructured variable bindings represented by one movable declaration
   family, so that binding leaves cannot be split incorrectly.
10. As a developer, I want overload signatures and their implementation represented by one Code
    Entity, so that one callable definition is not fragmented.
11. As a developer, I want legal declaration-merge contributions represented explicitly, so that
    their semantic relationship can be proven rather than assumed.
12. As a developer, I want named and anonymous default declarations represented, so that default
    exports participate without synthetic identities.
13. As a developer, I want aliases resolved to declaration-owning symbols, so that imports and
    exports remain edges rather than Code Entities.
14. As a tooling maintainer, I want candidates without coherent checker symbols excluded with typed
    evidence, so that parser recovery does not invent semantic identity.
15. As an architecture reviewer, I want dependencies alone excluded from Hard Bonds while proven
    semantic-reference cycles and exclusive ownership remain expressible, so that graph structure
    never becomes heuristic grouping.
16. As an architecture reviewer, I want barrier-crossing candidate bonds retained as suppressed
    evidence, so that rejected relationships remain auditable.
17. As a tooling consumer, I want complete ordered Semantic Module membership for any known Code
    Entity, so that downstream checks do not rescan TypeScript.
18. As a tooling consumer, I want ordered peers for any known Code Entity, so that singleton and
    multi-member cases are easy to consume.
19. As a tooling consumer, I want a deterministic Membership Proof between same-module entities, so
    that every inferred relationship is explainable.
20. As a tooling consumer, I want unknown and cross-module proof queries to return no proof, so that
    absence is unambiguous.
21. As a machine consumer, I want versioned portable JSON evidence, so that results can be validated
    without compiler object identity.
22. As a machine consumer, I want canonical ordering throughout the snapshot, so that equivalent
    inputs serialize identically.
23. As a developer, I want one mismatch for each split Semantic Module, so that no split is hidden
    by aggregation.
24. As a developer, I want one mismatch for each mixed Physical Module, so that every affected file
    is identified exactly once.
25. As a developer, I want complete Semantic Module membership in Advice, including members in other
    files, so that remediation does not create a second split.
26. As a developer, I want split and mixed Advice to coexist, so that one mismatch never suppresses
    another.
27. As a developer, I want reporting anchors clearly distinguished from destinations, so that Advice
    does not imply a move direction.
28. As a preset author, I want paradigm-specific Hard Bond catalogs passed explicitly, so that
    source code never selects a coding paradigm implicitly.
29. As a preset author, I want every Hard Bond rule to carry replayable evidence, so that additions
    remain deterministic and auditable.
30. As a Better TypeScript maintainer, I want one snapshot construction per configured Program
    scope, so that evidence is reused without global mutable state.
31. As a Better TypeScript maintainer, I want the complete feature enabled in every Architecture
    Explore preset and self-host scope, so that the repository follows its own Advice.
32. As a Better TypeScript maintainer, I want the warmed self-host benchmark to remain below 100ms,
    so that architecture inference does not compromise interactive use.

## Implementation Decisions

- The settled external seam is one deep matcher-side Semantic Module module. It owns snapshot
  construction, the versioned snapshot interface, pure queries, and the placement matcher.
  Normalization, bond evaluation, partitioning, and proof construction remain private.
- Core adds a Program-scoped matcher planning context containing the existing Program context plus
  the exact project source files included for that matcher by Wiring. Matcher execution derives this
  list from the existing first-party source predicate and per-matcher inclusion predicate. Per-file
  matching and Wiring's public data model do not change.
- A Code Entity is the smallest independently movable, symbol-bearing family of top-level
  declarations. Eligible families are functions, classes, interfaces, type aliases, enums, outermost
  namespaces/modules, and each variable declaration. Imports and exports are edges, not entities.
- One variable declaration is one Code Entity. Every recursively bound leaf identifier belongs to it
  in source order; property keys, omitted elements, and initializer references are evidence only.
- Top-level function declarations sharing one checker symbol in one Physical Module form one
  overload Code Entity. Other legal declaration-merge contributions remain separate Code Entities
  and are returned in canonical entity-key order.
- Each eligible outermost namespace/module declaration is one Code Entity, including dotted and
  repeated declarations. Nested members are evidence owned by that entity.
- Anonymous default classes and functions are Code Entities with stable display labels. Default
  expressions and export assignments are not. Import/export aliases never own Code Entities; aliases
  resolve to declaration-owned symbols.
- Candidates with no coherent checker symbol are excluded with a typed `missing-symbol` reason.
  Ambient declarations are excluded with `ambient-declaration`. No synthetic semantic identity is
  allowed.
- Entity identity is Program-scoped and serializes the normalized workspace-relative POSIX source
  path, declaration-family anchor start, anchor end, and SyntaxKind. The first declaration in source
  order is the family anchor. Display names are metadata, not identity.
- Sources participate only when included by the active Wiring scope and the existing first-party
  source predicate. Sources outside scope are absent from the snapshot and cannot mediate bonds.
- Ambient declarations, declaration-file contents, `declare` forms, ambient modules, global
  augmentations, and dependency declarations are ineligible. Generated and script roles are
  controlled only by Wiring globs; matched sources are treated normally.
- The only within-Program Partition Barrier is production versus test. Reuse the existing classifier
  for test directories, `*.test.ts[x]`, `*.spec.ts[x]`, and benchmark sources. npm packages and
  composition-root roles introduce no barrier.
- Eligibility and stratum assignment happen before candidate-bond closure. A candidate whose
  endpoints are not eligible members of the same Program and stratum becomes ordered suppressed-bond
  evidence and never affects membership or proofs.
- The only built-in neutral Hard Bond is ownership of the same canonical, non-alias TypeChecker
  symbol. Every symbol with multiple distinct eligible owners emits deterministic pairwise
  candidates. Exact duplicate candidates coalesce.
- Build one directed Semantic Reference Graph per Program stratum. Nodes are eligible Code Entities.
  An edge `A → B` records any TypeChecker-resolved reference in `A`'s declaration family to a symbol
  owned by `B`, including calls, values, types, construction, inheritance, decorators, and
  initializers. Alias symbols resolve to declaration owners; self and declaration-name references do
  not contribute.
- References outside every Code Entity are canonical unowned consumers. Export syntax, entity names,
  paths, current co-location, and consumers outside the Program do not affect the graph. The Program
  is the closed-world ownership scope.
- The neutral catalog contains `semantic-reference-cycle`. Every canonical strongly connected
  component with more than one Code Entity is atomic, including an ownerless root cycle. The rule
  emits canonical pairwise candidates between sorted members.
- The neutral catalog also contains `exclusive-consumer-ownership`. Condense the graph into its
  canonical SCC DAG. A target component with exactly one distinct incoming consumer component and no
  unowned consumer belongs to that consumer; emit the canonical resolved witness pair joining them.
  Zero-consumer roots and components with fan-in from multiple consumers emit no ownership bond.
- Ownership chains become one Semantic Module through ordinary Hard-Bond closure. Reference graphs
  are built independently for production and test, so one stratum cannot alter another's SCCs,
  consumer cardinality, or membership.
- Object-oriented and functional catalogs remain explicitly empty. Every Architecture Explore preset
  passes an explicit immutable catalog, and combined presets use the union of their constituent
  catalogs while instantiating one placement Policy.
- Every paradigm rule owns a tagged versioned evidence schema. Cycle evidence contains the complete
  sorted SCC and canonical internal reference witnesses. Ownership evidence contains source and
  target components, the complete incoming consumer set, absence of unowned consumers, and the
  selected canonical reference witness. Evidence keys derive only from this portable evidence.
- A future paradigm rule is admissible only when separation is necessarily defective under that
  paradigm. It may use normalized entities, current-Program TypeChecker facts, and deterministic
  closed-world premises. It may not consume another rule's results or inferred modules, or use
  names, paths, scores, confidence, thresholds, or arbitrary hubs as predicates.
- Semantic Module membership is the least equivalence relation containing accepted Hard Bonds.
  Eligible entities and canonical candidate tuples are sorted before a disjoint-set traversal. A
  forest bond is retained only when it joins previously distinct components.
- Component members are sorted by EntityKey. Semantic Modules are ordered by their first member and
  have no separate serialized id. The disjoint-set representative is private.
- A Membership Proof between distinct members is the unique ordered path through the canonical
  explanation forest. Self-membership has an empty proof. Different modules and unknown keys have no
  proof.
- Suppressed bonds never join components, enter proofs, or mediate transitive membership. Accepted
  redundant bonds remain audit evidence but are not part of the explanation forest.
- `SemanticModuleSnapshotV1` is immutable, versioned public JSON with exactly five top-level
  collections: normalized entities, Semantic Modules, accepted bonds, suppressed bonds, and
  exclusions.
- Entity records contain canonical identity, declaration-family anchors, stratum, and display
  metadata. Module records contain sorted member keys and their explanation-forest bond keys. Bond
  records contain canonical endpoint, rule, and evidence keys.
- Snapshot JSON contains no Program, AST node, Symbol, map, set, absolute path, cache, mutable
  state, object-identity reference, or implementation representative.
- `moduleFor` returns complete module membership for a known key. `peersFor` returns all other
  members in key order. `proofBetween` returns the directed forest path, an empty self-proof, or no
  proof for unknown/cross-module keys. Queries read only the snapshot and create no hidden mutable
  cache.
- One snapshot is built when the matcher plan is created for one Program and Wiring scope.
  Subscriptions close over it; the snapshot is released after matching. There is no global registry
  or engine evidence cache.
- The matcher emits one silent Signal named `semantic-module-placement` with two tagged projections:
  `split-semantic-module` and `mixed-physical-module`.
- A split projection is emitted once per Semantic Module occupying multiple Physical Modules and is
  located at its canonical first member's declaration anchor. A mixed projection is emitted once per
  Physical Module containing multiple Semantic Modules and is located at file position 1:1.
- Each projection carries only the relevant portable snapshot slice: complete ordered entity
  records, ordered Physical Module paths, and canonical explanation-forest bonds with replayable
  evidence. The complete Program snapshot never crosses the Signal seam.
- Split Detection message: `This Semantic Module spans multiple Physical Modules.` Hint:
  `Keep every listed Code Entity in one Physical Module; the reporting anchor does not imply a destination or move direction.`
- Mixed Detection message:
  `This Physical Module contains Code Entities from multiple Semantic Modules.` Hint:
  `Separate the listed Semantic Modules without splitting their complete membership; no destination or move direction is inferred.`
- The Signal is silent. One Architecture Explore adviser renders file-level Advice. Raw Detections
  do not render because they cannot show the typed evidence and would duplicate Advice.
- Mixed Advice is emitted once per mixed file and lists every involved Semantic Module's complete
  membership, including members in other files. Its evidence counts are `code-entities-here` and
  `semantic-modules`.
- Split Advice is grouped by canonical anchor file and lists every split Semantic Module anchored
  there. Its evidence counts are `code-entities`, `physical-modules`, and `split-semantic-modules`.
- Mixed Advice is titled `mixed Physical Module`; its remediation reports the Semantic Module count,
  requires separation without splitting listed membership, and states that no destination or move
  direction is inferred.
- Split Advice is titled `split Semantic Modules`; its remediation reports the split count with
  grammatical singular/plural forms, requires each listed Semantic Module to occupy one Physical
  Module, and states that the anchor is only a deterministic reporting location.
- Advice entity rows contain display name, declaration kind, and `path:line:column`. Complete
  EntityKeys and bond evidence remain in typed Detection data for audit and machine use.
- Advice blocks sort by file path; at one path, `mixed Physical Module` precedes
  `split Semantic Modules`. Split and mixed mismatches remain independent. No aggregate suppresses
  another mismatch.
- Every Architecture Explore preset includes the Policy and adviser. The feature is enabled for
  configuration, all package sources, and tests in self-hosting. It is not added to baseline default
  Wiring.

## Testing Decisions

- Tests defend observable contracts: exact partition membership, portable evidence, public query
  results, typed mismatch projections, rendered Advice, scope behavior, determinism, and
  performance. They must not assert private traversal, disjoint-set representation, or incidental
  helper structure.
- Use the public snapshot interface as the detailed matcher seam and a Program-to-normalized-report
  test as the highest end-to-end seam. One private test seam may permute otherwise unobservable
  partition inputs; it must not enlarge the public interface.
- Add orthogonal Semantic Module fixture Programs plus one composite end-to-end Program. Each
  fixture has a human-authored typed manifest; generated expected output is forbidden.
- Manifest labels select one entity by fixture-relative path, declaration kind, display name, and
  occurrence. The harness proves every selector resolves once and every observed entity has one
  label before translating labels to runtime EntityKeys.
- Matcher tests cover every declaration family; single- and multi-leaf bindings; overloads; legal
  merge contributions; repeated and dotted namespaces; named and anonymous defaults; and alias
  behavior.
- Matcher tests cover `ambient-declaration` and `missing-symbol` exclusions. Parser recovery for
  `missing-symbol` uses an isolated Program outside diagnostic-clean fixtures.
- Matcher tests cover singleton membership, same-symbol bonds, duplicate coalescing, a redundant
  triangle and canonical forest, production/test suppression, excluded-source absence, Program
  isolation, and ordinary non-bonding dependencies.
- Semantic Reference Graph tests cover exclusive chains, shared fan-in, zero-consumer roots, unowned
  top-level references, every reference kind, aliases, root and owned SCCs, Program isolation, and
  independent production/test graphs.
- Focused contract tests assert exact `SemanticModuleSnapshotV1` JSON: keys, anchors, strata, all
  collections, tagged evidence, exclusions, and canonical nested ordering.
- Query tests assert complete module and peer results plus self, forward, reverse, cross-module, and
  unknown-key proof behavior.
- Guidance tests cover clean, split-only, mixed-only, overlapping split-and-mixed, multiple splits
  sharing an anchor, canonical ordering, and exact deduplication.
- Every mismatch test asserts the full typed projection: tag, location, prose, hint, complete
  ordered membership, paths, forest bonds, evidence keys, and count.
- Advice tests assert the full structured result: title, location, remediation, evidence measures,
  entity rows, grouping, and mixed-before-split order.
- One composite test runs the Program through matcher, silent Signal, adviser, and normalized
  renderer. Its exact report contains no raw `semantic-module-placement` block.
- Byte-identity metamorphic tests permute source files, normalized entities, rule registration,
  candidate emission, and duplicate emission. Snapshot JSON, query results, projections, and Advice
  remain identical.
- Label-remapped metamorphic tests rename displays, insert whitespace/comments, and relocate
  declarations within one stratum. Membership and proof rule/evidence structure remain equivalent
  after label remapping; only anchors, keys, paths, induced ordering, and placement mismatches may
  change.
- Controlled-change tests prove exact deltas: crossing the production/test barrier suppresses a
  same-symbol bond and splits membership; changing only Physical Module placement changes only
  placement projections; adding a non-exclusive reference removes only its ownership bond; forming
  or breaking an SCC adds or removes only its cycle bonds.
- Follow existing prior art from project fixture policy tests, reusable architecture evidence tests,
  Architecture Explore adviser tests, silent report-pipeline tests, workspace test classification
  tests, and self-host benchmark enrollment tests.
- Focused feature tests and the full suite must pass. Self-hosting must emit no Check or Advice with
  the Policy enabled everywhere required; no baseline or allowlist is valid.
- The benchmark enrollment test must name `semantic-module-placement`. The existing warmed merged
  default-plus-Architecture-Explore benchmark must report a measured mean strictly below 100ms;
  record the observed mean.

## Out of Scope

- Choosing filenames, destination paths, or move direction for a Semantic Module.
- Automatically moving Code Entities or applying refactors.
- Heuristic grouping from names, comments, paths, co-change history, repository ownership metadata,
  runtime traces, scores, confidence, or thresholds.
- Shipping non-empty object-oriented or functional Hard Bond catalogs.
- Semantic simplification, inlining, or reducing the number of Code Entities.
- Persisting snapshots across runs or adding a global evidence registry.
- Enabling the Policy in baseline default Wiring.

## Further Notes

- The resolved wayfinder map and its ten linked decision tickets are the source of truth for
  detailed rationale.
- The domain glossary defines Physical Module, Semantic Module, Split Semantic Module, Mixed
  Physical Module, Semantic Module Snapshot, Code Entity, Semantic Reference Graph, Hard Bond,
  Exclusive Consumer Ownership, Semantic Reference Cycle, Paradigm Hard Bond Rule, Partition
  Barrier, and Membership Proof.
- The seam is already settled by the resolved seam-placement decision: one deep matcher module plus
  the existing Signal-to-Advice pipeline. No additional public seam is required.
