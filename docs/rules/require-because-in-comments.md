# require-because-in-comments

## What it does

Reports line and block comments that lack the standalone word `because`. It reports: `Comments must explain why using the word "because". Delete the comment if it does not explain a reason.`

## When to use it

Use it when comments must explain a reason instead of restating code.

## Conformant

```ts
// Kept because callers need it.
const value = 1
```

## Non-conformant

```ts
// Explains the value.
const value = 1
```
