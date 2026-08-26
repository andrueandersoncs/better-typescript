# prefer-effect-array-append-all

## What it does

Reports an array spread whose conditional expression has one arm that is exactly an empty array literal and another arm that is not an empty array literal, after unwrapping parentheses.

## When to use it

Use it for a conditional array spread whose one arm is exactly `[]` and whose other arm is not an empty array literal. Either arm may be selected when the written condition is true.

## Conformant

```ts
declare const condition: boolean
const values = [1, ...(condition ? [2] : [3])]
```

## Non-conformant

```ts
declare const condition: boolean
const values = [1, ...(condition ? [2] : [])]
```
