# prefer-direct-boolean-return

## What it does

Reports conditional return shapes that use boolean literals instead of the condition. The tested report says: `Avoid returning true from a conditional branch. Use the condition as the boolean value instead: return (condition).`

It also reports supported branches that return a value and then `false`. Those reports recommend `&&`.

## When to use it

Use it when a condition already is the boolean result. Direct boolean expressions are allowed.

## Conformant

```ts
declare const condition: boolean
const result = condition
```

## Non-conformant

```ts
declare const condition: boolean
const result = condition ? true : false
```
