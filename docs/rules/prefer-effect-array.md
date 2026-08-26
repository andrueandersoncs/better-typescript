# prefer-effect-array

## What it does

Reports calls to standard `Array.prototype` methods on arrays and tuples. For example, the tested report says: `Avoid Array.prototype.map().` It recommends the matching helper from Effect's `Array` module.

Property reads such as `length` are allowed.

## When to use it

Use it to replace direct array method calls with Effect `Array` helpers.

## Conformant

```ts
const values = [1, 2, 3]
const count = values.length
```

## Non-conformant

```ts
const values = [1, 2, 3]
const doubled = values.map((value) => value * 2)
```
