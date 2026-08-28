# unsafe-casts

## What it does

Reports two unsafe assertion forms:

- Literal `as any` and `<any>` assertions.
- Assertions from a checker-resolved `unknown` value to a type other than `unknown` or `any`.

The first form keeps the existing `as any` message. The second reports at the target type node and asks the user to preserve its type in the algorithm or data structure, decode it with Schema, or narrow it with a verified predicate. The rule checks both `as` and angle-bracket assertions.

## When to use it

Use it to reject unchecked conversions from `unknown` and unchecked conversions to literal `any`.

## Conformant

```ts
type UnknownAlias = unknown

declare const value: unknown
declare const dynamic: any

const stillUnknown = value as UnknownAlias
const fromAny = dynamic as string

if (typeof value === "string") {
  const narrowed = value as string
}
```

## Non-conformant

```ts
declare const value: unknown

const unchecked = value as string
const erased = value as any
```
