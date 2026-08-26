# prefer-curried-data-last-functions

## What it does

Checks function declarations, methods, function expressions, and arrow functions. Reports these function forms for multiple runtime parameters or a rest parameter, except contextually typed arrows/function expressions and named functions with at least one reference, where every reference is a direct call argument and that call’s resolved signature is declared in a `.d.ts` or default-library file. The receiving parameter is not checked to be callable. A this parameter does not count.

Tested unary curried arrows are allowed.

## When to use it

Use it to curry runtime parameters into unary functions, with configuration first and the primary data value last.

## Conformant

```ts
const combine = (left: string) => (right: string) => left + right
```

## Non-conformant

```ts
function combine(left: string, right: string) {
  return left + right
}
```
