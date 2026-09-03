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

- Observable shape: A single-argument function wraps the `String.trim` method.
- Existing rules: `redundant-alias` covers type declarations, and `prefer-eta-reduction` allows checker-identified methods.
- Pattern: none
- Emergence: no-pattern
- Reason: No built-in rule owns this shape, and one method wrapper does not establish a reusable default rule.

### Shape: Type-specific equivalence strict comparators

- Observable shape: The module binds `Equivalence.strictEqual` separately for `string` and `boolean`.
- Existing rules: `no-type-specific-equivalence-strict`
- Pattern: none
- Emergence: covered
- Reason: The built-in rule reports excess top-level primitive-specific `Equivalence.strictEqual` bindings.

### Shape: Boolean predicate from equivalence

- Observable shape: A function compares a boolean to `false` through a bound equivalence.
- Existing rules: `prefer-direct-boolean-return` covers conditional boolean-literal returns, not this direct expression.
- Pattern: none
- Emergence: no-pattern
- Reason: No built-in rule owns this shape, and one local wrapper does not establish a reusable pattern.
