# Constructable runtime record object

- Status: prospective
- Status-source: agent
- Rule candidate: none
- Created: 2026-09-03
- Updated: 2026-09-03

## Invariant

Do not expose a first-party constructable runtime data structure as an object-literal `make` factory that returns a fixed record of callable operations. Define a class extending `Schema.Class` and put construction on its static API. A namespace-like object of independent helpers, or a factory returning a foreign runtime handle, remains allowed.

## Detection

Find an exported variable initialized to an object literal with a `make` property whose callable implementation contains a return of a non-empty object literal. Use the checker to require callable members on the returned record and a first-party return shape.

## Evidence

- Snippets:
  - [008](../snippets/008-persisted-ref-object-factory.md)
- Allowed nearby:
  - An exported object that groups independent helpers and does not construct one record
  - A factory that returns a primitive or foreign runtime handle

## Overlap

`prefer-effect-schema-class` and `prefer-effect-schema-constructor` intentionally allow runtime records with callable properties, so neither owns this stricter class-modeling preference. `no-first-party-root-class` constrains class declarations but cannot report an object-literal factory.

## Decision

- 2026-09-03: Prospective from one snippet; detection and replacement are clear, but independent evidence is still required.
