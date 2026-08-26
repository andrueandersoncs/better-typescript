# no-multiple-boolean-operators

## What it does

Reports a counted expression tree with more than one supported boolean operator. The supported operators are `&&`, `||`, `===`, `!==`, `!`, and the conditional operator. A conditional's condition is counted separately from its result branches.

## When to use it

Use it to keep boolean steps separate and named. One supported operator in an expression is allowed.

## Conformant

```ts
declare const a: boolean, b: boolean
const both = a && b
```

## Non-conformant

```ts
declare const a: boolean, b: boolean, c: boolean
const result = a && b || c
```
