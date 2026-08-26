# no-value-aliases

## What it does

Reports an identifier-named `const` whose whole initializer, after outer parentheses, assertion, `satisfies`, and non-null wrappers are removed, is a bare identifier or a non-optional dot-property chain with identifier/dot-property receivers. Element access and wrappers inside a property-chain receiver are not checked.

## When to use it

Use it to refer to an existing value directly instead of giving the same value another name. Create behavior or new data when the new name has distinct meaning.

## Conformant

```ts
const source = { value: 1 }
export const result = { value: source.value }
```

## Non-conformant

```ts
const source = { value: 1 }
export const result = source.value
```
