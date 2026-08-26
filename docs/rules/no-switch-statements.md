# no-switch-statements

## What it does

Reports every `switch` statement. It recommends Effect's `Match` module and exhaustive matching.

## When to use it

Use this rule when the project uses pattern matching instead of `switch` statements.

## Conformant

```ts
const isOne = (value: number) => value === 1
```

## Non-conformant

```ts
function isOne(value: number) {
  switch (value) {
    case 1:
      return true
    default:
      return false
  }
}
```
