# require-safety-comment-for-type-assertion

## What it does

Requires a nearby non-empty `SAFETY:` justification for every non-const type assertion.

## When to use it

Use it when a necessary assertion must state the invariant TypeScript cannot express. The comment must also satisfy `require-because-in-comments`.

## Conformant

```ts
// SAFETY: The value is branded because the parser validated it.
const id = value as UserId
```

## Non-conformant

```ts
const id = value as UserId
```
