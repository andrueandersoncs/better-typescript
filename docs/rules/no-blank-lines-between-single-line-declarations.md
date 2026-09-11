# no-blank-lines-between-single-line-declarations

## What it does

Reports a blank line between adjacent single-line declarations of the same syntax kind inside a function. Remove that empty line to keep the declarations contiguous. `const`, `let`, and `var` share one kind; classes, functions, interfaces, type aliases, enums, and namespaces each have their own kind. Top-level declarations, different-kind pairs, and pairs with a multi-line declaration are not reported.

Keep separators required by [`require-blank-lines-between-statement-kinds`](./require-blank-lines-between-statement-kinds.md) and [`require-blank-lines-around-multiline-statements`](./require-blank-lines-around-multiline-statements.md).

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
