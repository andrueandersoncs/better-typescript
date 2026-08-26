# no-nested-if-statements

## What it does

Reports an `if` statement contained by another `if` statement. An outer `if` does not count as containing it when traversal reaches that outer `if` through its `else` branch, including through an `else { ... }` block. A nested function starts a new boundary.

## When to use it

Use it to keep conditions at one level. Combine related conditions or return early.

## Conformant

```ts
declare const ready: boolean
if (ready) console.log("ready")
```

## Non-conformant

```ts
declare const a: boolean, b: boolean
if (a) {
  if (b) console.log("nested")
}
```
