# Renamable object property aliases

- Status: prospective
- Status-source: agent
- Rule candidate: none
- Created: 2026-09-05
- Updated: 2026-09-05

## Invariant

Do not give a project-owned binding a different name only when placing it in an object literal. Match the binding to the required property name and use shorthand. An adapter to a foreign contract, or a binding with independent meaning or other consumers, remains allowed.

## Detection

Find an object-literal property assignment whose static name differs from its identifier initializer. Use checker symbols and references to require a project-owned binding whose value uses all occur under that one property name, and exclude foreign contextual object types and rename collisions.

## Evidence

- Snippets:
  - [010](../snippets/010-renamable-object-property-aliases.md)
- Allowed nearby:
  - A deliberate mapping into a foreign or externally fixed object contract
  - A binding with independent semantics or consumers outside the matching property

## Overlap

`no-value-aliases` reports whole `const` initializers, not object members. `prefer-effect-schema-constructor` permits identifier bags and callable runtime records without requiring binding and property names to match. `no-pass-through-object-wrappers` reports forwarding functions, not standalone object literals.

## Decision

- 2026-09-05: Prospective from one snippet; detection and replacement are clear, but independent evidence is still required.
