# process-environment

## What it does

In a production path, reports a property or element-access chain rooted at dot `process.env` or string-element `process["env"]`, including assignment targets. Later element keys may be dynamic. Parentheses, `as`, and `satisfies` are skipped for outermost detection, but a non-null wrapper can cause both an inner and outer access to report.

## When to use it

Use it to keep runtime configuration deterministic. Tests, entrypoints, composition roots, and `main`, `bootstrap`, or `wiring` files are allowed.

## Conformant

```ts
export const value = "configured"
```

## Non-conformant

```ts
export const value = process.env.API_KEY
```
