# Trivial equivalence wrapper

- ID: 002
- Added: 2026-09-02
- Source: conversation
- Path: none

## Why it is bad

unspecified

## Code

```ts
const trim = (value: string) => value.trim();
const stringEqual = Equivalence.strictEqual<string>();
const booleanEqual = Equivalence.strictEqual<boolean>();
const booleanEqualsFalse = (value: boolean) => booleanEqual(value, false);
```

## Analysis

### Shape: Pass-through string wrapper

- Observable shape:
  - Single-argument function wrapping a string method call
- Existing rules: `redundant-alias`
- Pattern: none
- Emergence: covered
- Reason: Covered by existing built-in rule for redundant aliases

### Shape: Type-specific equivalence strict comparators

- Observable shape:
  - Creating multiple Equivalence.strictEqual instances for primitive types
- Existing rules: none
- Pattern: [type-specific-equivalence-strict](../patterns/type-specific-equivalence-strict.md)
- Emergence: new-prospective
- Reason: Detectable via AST: calls to Equivalence.strictEqual with type arguments; replacement: use generic EquivalenceStrictEqual directly

### Shape: Boolean predicate from equivalence

- Observable shape:
  - Function that compares boolean to false via equivalence wrapper
- Existing rules: `prefer-direct-boolean-return`
- Pattern: none
- Emergence: covered
- Reason: Covered by existing rule preferring direct boolean comparisons
