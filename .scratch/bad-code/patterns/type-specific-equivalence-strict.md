# Type-specific equivalence strict comparators

- Status: rejected
- Status-source: agent
- Rule candidate: none
- Created: 2026-09-02
- Updated: 2026-09-03

## Invariant

Avoid families of primitive-specific `Equivalence.strictEqual<T>()` bindings. Compare at the use site or expose one generic comparison operation. A single semantically named equivalence instance is allowed.

Primitive-specific bindings duplicate the same runtime comparator and expand the API without adding behavior.

## Detection

AST: within one module, find multiple variable initializers calling `Equivalence.strictEqual` with explicit primitive type arguments.

## Evidence

- Snippets:
  - none
- Allowed nearby:
  - One semantically named equivalence instance
  - A direct `Equivalence.strictEqual<T>()` comparison at its use site

## Overlap

`no-type-specific-equivalence-strict` owns families of top-level primitive-specific bindings. `prefer-equivalence-strict-equal` continues to own raw `===` comparisons.

## Decision

- Initial status: prospective (one evidence snippet)
- 2026-09-02: Confirmed from two independent snippets with the same detectable family and replacement.
- 2026-09-03: Rejected because the built-in `no-type-specific-equivalence-strict` rule now owns the pattern.
