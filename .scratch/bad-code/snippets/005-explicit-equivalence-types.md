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

### Shape: Type-specific equivalence strict comparators

- Observable shape: The module binds `Equivalence.strictEqual` separately for `string` and `number`.
- Existing rules: `no-type-specific-equivalence-strict`
- Pattern: none
- Emergence: covered
- Reason: The built-in rule reports excess top-level primitive-specific `Equivalence.strictEqual` bindings.
