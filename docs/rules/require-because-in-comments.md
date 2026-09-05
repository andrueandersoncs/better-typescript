# require-because-in-comments

## What it does

Reports ordinary line and block comments that lack the standalone word `because`. Parsed JSDoc, `@barrel` metadata comments, and exact `// => expression` doctest assertions are preserved because they are tool inputs. It reports: `Comments must explain why using the word "because". Delete the comment if it does not explain a reason.`

## When to use it

Use it when ordinary prose comments must explain a reason instead of restating code.

## Conformant

```ts
// Kept because callers need it.
const value = 1

/** @since 4.0.0 */
export const documented = value
```

## Non-conformant

```ts
// Explains the value.
const value = 1
```
