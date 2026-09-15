# Repeated sibling adapter wrappers

- Status: prospective
- Status-source: agent
- Rule candidate: none
- Created: 2026-09-14
- Updated: 2026-09-14

## Invariant

Do not repeat the same adapter protocol across three or more sibling unary functions when the bodies differ only by type constraints, constructor members, and parameter or property names. Extract one typed adapter factory that owns the shared construction and augmentation. Sibling functions with distinct validation, defaults, transformations, or other policy remain allowed.

## Detection

Find at least three sibling function declarations or variable-bound functions in one lexical scope. Normalize generic and parameter identifiers, type constraints, property keys, and corresponding member names, then compare the statement ASTs. Require each body to construct from a record containing its sole parameter and then pass the constructed value plus the same record to one shared augmentation callee.

## Evidence

- Snippets:
  - [015](../snippets/015-repeated-application-part-adapters.md)
- Allowed nearby:
  - Two adapters that do not yet establish a repeated family
  - Sibling wrappers whose bodies enforce different validation, defaults, transformations, or policy

## Overlap

`no-pass-through-object-wrappers` deliberately permits unary constructor adapters and does not match this two-statement protocol. `prefer-function-composition` requires unary value threading and does not match the binary augmentation call. `no-duplicate-function-names` compares same-named functions across files without comparing bodies. `duplicate-shape` compares interfaces and type aliases, not implementations.

## Decision

- 2026-09-14: Prospective from one snippet containing four instances; the repeated protocol, boundary, and replacement are clear, but independent snippet evidence is still required.
