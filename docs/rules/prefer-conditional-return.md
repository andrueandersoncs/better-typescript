# prefer-conditional-return

## What it does

Reports an `if` that only chooses between two returned expressions. The second return can be in `else` or in the next statement. It suggests one conditional return.

The tested direct conditional expression is allowed. It also allows branches with multiple statements, values longer than 100 characters, multiline values, `yield`, and values that are already conditional expressions.

## When to use it

Use it to replace simple return-only branches with a direct conditional expression.

## Conformant

```ts
export const choose = (condition: boolean) => condition ? "yes" : "no"
```

## Non-conformant

```ts
export function choose(condition: boolean) {
  if (condition) return "yes"
  return "no"
}
```
