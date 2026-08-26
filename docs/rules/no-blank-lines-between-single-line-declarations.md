# no-blank-lines-between-single-line-declarations

## What it does

Reports a blank line between adjacent single-line declarations inside a function. The report says: “Single-line declarations must not have blank lines between them. Remove the empty line between these adjacent single-line declarations so they stay contiguous. Blank lines remain required around multi-line declarations; keep those separators when a neighbor is multi-line.” Despite that help text, this rule does not enforce separators around multi-line declarations; any pair with a multi-line declaration is exempt. Top-level declarations and pairs with a multi-line declaration are not reported.

## When to use it

Use it to keep short local declarations together.

## Conformant

```ts
function value() {
  const left = 1
  const right = 2
  return left + right
}
```

## Non-conformant

```ts
function value() {
  const left = 1

  const right = 2
  return left + right
}
```
