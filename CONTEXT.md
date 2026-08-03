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