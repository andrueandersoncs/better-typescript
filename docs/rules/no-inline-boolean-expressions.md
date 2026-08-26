# no-inline-boolean-expressions

## What it does

Reports an `if` condition whose top-level expression uses `&&` or `||`. Parentheses do not hide the expression.

## When to use it

Use it when boolean logic in an `if` should have a clear name. Extract the expression to a `const`.

## Conformant

```ts
declare const a: boolean, b: boolean
const both = a && b
if (both) console.log("ok")
```

## Non-conformant

```ts
declare const a: boolean, b: boolean
if (a && b) console.log("not ok")
```
