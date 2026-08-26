# prefer-function-flip

## What it does

Reports expression-bodied unary arrows whose outer call has one fixed argument and whose inner call passes the parameter as its sole argument, when the inner callee is not a dot-property access. The parameter must be plain, required, and the only same-spelled identifier use; the fixed argument must not use that spelling. Direct partial application and dot-property callees are allowed; element-access calls can report.

## When to use it

Use it to prefer data-last parameter order or `Function.flip` over a flipping wrapper.

## Conformant

```ts
declare const f: (x: number) => (y: string) => string
export const direct = f(1)
```

## Non-conformant

```ts
declare const f: (x: number) => (y: string) => string
declare const fixed: string
export const flipped = (x: number) => f(x)(fixed)
```
