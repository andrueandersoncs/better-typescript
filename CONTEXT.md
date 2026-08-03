# Better TypeScript

TypeScript analysis for coding agents: Checks emit Detections, Wiring materializes Signals, and
derive emits Advice.

## Language

**Physical Module**: One TypeScript source file — the language-level module boundary. Advice may
still title a directory when clusters span files. _Avoid_: component, service, package (unless
meaning npm package)

**Semantic Module**: One equivalence class in the strict partition of Code Entities that belong
together and therefore belong in the same Physical Module, regardless of their current placement.
Singletons are valid. _Avoid_: cluster, group

**Code Entity**: The smallest independently movable, symbol-bearing family of top-level
declarations. Nested declarations and expressions are evidence about their owning Code Entity;
imports and exports describe Physical Module edges. _Avoid_: node, statement

**Hard Bond**: An explainable semantic relation sufficient by itself to require two eligible Code
Entities to share a Semantic Module. Dependencies, including cycles, are not Hard Bonds.

**Partition Barrier**: An absolute prohibition against joining two otherwise eligible Code Entities.
Inference rejects and records a candidate bond that crosses one before membership closure. Source
exclusion is not a Partition Barrier: an excluded declaration never becomes a Code Entity.

**Membership Proof**: The deterministic ordered Hard-Bond chain explaining why two Code Entities
share one Semantic Module. Self-membership has an empty proof; entities in different Semantic
Modules have none.
