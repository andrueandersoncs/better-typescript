# prefer-implicit-return

## What it does

Requires an arrow function with a block containing only one value-return statement to use an implicit return.

## When to use it

Use it to keep simple arrow functions concise. Blocks with other statements, multiple statements, or a bare `return` are allowed.

## Conformant

```ts
export const value = () => 1
```

## Non-conformant

```ts
export const value = () => { return 1 }
```
