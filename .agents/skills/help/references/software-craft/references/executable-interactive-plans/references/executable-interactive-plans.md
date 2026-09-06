# Executable plans as reviewed Effect contracts

## Purpose

An executable plan makes the proposed Effect contract reviewable against the genuine current contract before implementation. Its review order is deliberate: scope board, exact source diff, story evidence, explicit approval, then export. Green properties establish fixture agreement and executable specification, not completed production behavior; later verification must bind assertions to the real public boundary.

## Baseline and declaration inventories

For an existing system, preserve the current declaration files under `src/current/` before authoring the proposal. Keep the copied local import tree intact, including helper imports: imports within that tree must resolve to `src/current/`, never to proposed source. A plan for entirely new work may declare `currentCode: []`.

`PlanDefinition` declares both `currentCode` and `proposedCode`. Pair the same conceptual contract with the same stable ID; additions and removals occur only in their respective inventory. Each record identifies its local source, exported symbol, category, scope, and explicit dependencies; the server derives declaration ranges. Categories are `Schema`, `Error`, `Service`, `Interface`, `Type`, and `EffectfulFunction`; service shapes use `Interface`.

Inspect only trusted declarative modules. Inspection imports those modules, so their top-level initializers run and lazy Schemas are forced; it neither runs tests nor proves behavior. Keep business side effects out of inspected modules: the viewer is not a sandbox.

## Scope graph

`scopeGraph` is a bounded declaration graph built from inspected current and proposed modules, not an application model:

- Schema composition comes from each declaration's real SchemaAST.
- Effectful functions declare input Schema IDs, success Schema ID, Error IDs, Service IDs, and `dependencyIds`.
- Other declaration edges come only from their explicit `dependencyIds`.

Do not make type-compatible inferred wires, repository-wide declaration inventories, or runtime call graphs. The graph presents three different kinds of review information:

- **Declared edits** are additions, removals, and paired declaration changes.
- **Unchanged source context** is nearby or connected source retained to orient the reviewer. It does not claim behavioral non-impact.
- **Structural/dependency effects** are the graph relationships derived by the bounded rules above.

The scope board uses a perspective camera with standard Three.js OrbitControls: primary drag orbits, wheel or pinch zooms, and secondary drag or a two-finger gesture pans. Reset camera restores the initial elevated view without changing the selected contract. Its category silhouettes use literal code-role metaphors: record cards for Schemas, warning signs for Errors, server stacks for Services, matching connectors for Interfaces, `T` tags for Types, and input–processor–output pipelines marked `F` for effectful functions. Persistent labels repeat each category. Physically lit PBR surfaces use restrained shader-enhanced highlights. Trace colors, rail patterns, and terminals identify relationship kinds, with an on-board key and arrowheads pointing toward referenced contracts.

A keyboard-accessible contract list provides the same review information without WebGL. Use either surface to select a declaration, inspect its category and relationship, and move to its exact source.

## Exact source contracts

The Monaco current/proposed source diff is authoritative for Schema, Interface, Type, and function-signature review. Use it after the board to judge the exact declarations, not a board label or inferred edge.

Effect contracts record explicit input, success, error, service, and dependency metadata. A `never` Error channel uses an empty Error list. Error-channel membership does not assert that a story expects every Error.

## Story evidence and decision

Each story has a stable ID, title, outcome, and one or more canonical test files. Each property uses `it.effect.prop` with a proposed Schema, receives a fresh fixture Layer, and calls the proposed function. `assertedErrorIds` identifies only Errors whose outcome the property actually asserts.

The local review server keeps the existing evidence controls:

- loopback, same-origin, per-session-token access and allowlisted files;
- repository containment, loaded-hash concurrency checks, declaration-range writes, atomic save, and append-only audit;
- selected canonical Vitest execution with server-owned result and evidence hashes;
- targeted invalidation for changed tests, declarations, dependencies, and shared fixture/import content;
- approval blocked by unsaved edits, unresolved save failures, or current failed/not-run properties.

A source change clears the decision. Never accept client-supplied test results as evidence and never infer approval.

## Source snapshots and export

The version `2.0.0` artifact contains ordered stories, test inventory and exact test files, `currentCode`, `proposedCode`, `scopeGraph`, source snapshots, the explicit decision, server-owned results and evidence hashes, comments, and the edit audit. Snapshots include statically resolved local imports under the plan root, excluding installed packages and virtual modules. Keep inspection inputs in that tree; preserve the pinned dependency versions. Imported helper changes invalidate inspection and dependent test evidence. The server rechecks captured bytes after inspection before caching. A stale snapshot cannot be exported; durable and downloaded artifact bytes match.

## Template contract

The template at `assets/story-test-template/` owns the review shell and server. A generated plan supplies `plan-data.ts`, `src/current/*` when there is a baseline, `src/domain/*` for the proposal, `src/story-tests/*`, and optional theme tokens.

## Focused acceptance check

In one browser pass, review every relevant declaration from the scope board and no-WebGL list, inspect its exact current/proposed diff, run every story property, follow test-to-declaration and declaration-to-test links, and exercise isolated reversible test and declaration saves. Confirm targeted invalidation, blocked approval for failed or stale saves, and matching exports. Leave the real draft without synthetic edits or a decision artifact, then pause for the human decision.
