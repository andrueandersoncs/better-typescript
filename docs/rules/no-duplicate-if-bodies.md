# no-duplicate-if-bodies

## What it does

Reports separate consecutive `if` statements in the same block when their bodies are identical and the later body exits the scope. Adjacent top-level `if` statements are allowed. It separately reports an `else if` body that matches the preceding body.

## When to use it

Use it to combine pseudo-duplicate branches with `||`.

## Conformant

```ts
function parse(value: string): void {
  if (value === "one") return
  if (value === "two") throw new Error("two")
}
```

## Non-conformant

```ts
function parse(value: string): void {
  if (value === "one") return
  if (value === "two") return
}
```
