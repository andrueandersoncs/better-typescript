# Type-specific equivalence strict comparators

- Status: confirmed
- Status-source: agent
- Rule candidate: `no-type-specific-equivalence-strict`
- Created: 2026-09-02
- Updated: 2026-09-02

## Invariant

Avoid families of primitive-specific `Equivalence.strictEqual<T>()` bindings. Compare at the use site or expose one generic comparison operation. A single semantically named equivalence instance is allowed.

Primitive-specific bindings duplicate the same runtime comparator and expand the API without adding behavior.

## Detection

AST: within one module, find multiple variable initializers calling `Equivalence.strictEqual` with explicit primitive type arguments.

## Evidence

- Snippets:
  - [002](../snippets/002-trivial-equivalence-wrap.md) — defines `stringEqual` and `booleanEqual`
  - [005](../snippets/005-explicit-equivalence-types.md) — independently defines string and number instances
- Allowed nearby:
  - One semantically named equivalence instance
  - A direct `Equivalence.strictEqual<T>()` comparison at its use site

## Overlap

- `redundant-alias` covers pass-through wrappers, not these bound comparator instances.
- `prefer-equivalence-strict-equal` recommends the API over raw `===` but does not own repeated primitive-specific bindings.
- No built-in rule owns this family.

## Decision

- Initial status: prospective (one evidence snippet)
- 2026-09-02: Confirmed from two independent snippets with the same detectable family and replacement.
