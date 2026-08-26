# require-blank-lines-around-multiline-declarations

## What it does

Reports a multi-line variable statement, function, class, interface, type alias, enum, or module declaration without a blank line between it and a neighboring statement. It reports: `Multi-line declarations must have a blank line above and below.` The first and last statements in a block are exempt on their outer sides. Single-line declarations are allowed without blank lines.

## When to use it

Use it to visually separate multi-line declarations.

## Conformant

```ts
const before = 1

const value = {
  count: 1
}
```

## Non-conformant

```ts
const before = 1
const value = {
  count: 1
}
const after = 2
```
