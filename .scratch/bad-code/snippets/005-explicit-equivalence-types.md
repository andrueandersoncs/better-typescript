# Explicit type parameters on Equivalence.strictEqual

- ID: 005
- Added: 2026-09-02
- Source: paste
- Path: none

## Why it is bad

unspecified

## Code

```ts
const equalString = Equivalence.strictEqual<string>();
const equalNumber = Equivalence.strictEqual<number>();
```

## Analysis

### Shape: explicit type parameters on Equivalence.strictEqual

- Observable shape: Type arguments on `Equivalence.strictEqual<T>()` calls where `T` could be inferred
- Existing rules: none
- Pattern: [type-specific-equivalence-strict](../patterns/type-specific-equivalence-strict.md)
- Emergence: attached
- Reason: This independently repeats the existing pattern's family of primitive-specific `Equivalence.strictEqual` bindings.
