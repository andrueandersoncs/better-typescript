# no-runtime-typeof

## What it does

Reports runtime `typeof` checks except existence probes against the string `"undefined"`.

## When to use it

Use it when external values must be parsed at their I/O boundary.

## Conformant

```ts
const missing = typeof document === "undefined"
```

## Non-conformant

```ts
if (typeof input === "string") use(input)
```
