# no-widen-then-assert

## What it does

Reports a local `const` that widens known evidence and is later asserted to a narrower type in the same function boundary.

## When to use it

Use it to preserve precise types from initialization through use.

## Conformant

```ts
declare const input: unknown
const parsed = decode(input)
```

## Non-conformant

```ts
const stored: unknown = loadUser()
const user = stored as User
```
