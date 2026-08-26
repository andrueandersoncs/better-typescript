# no-instanceof

## What it does

Reports `instanceof` checks with a right-side symbol that has at least one first-party declaration. Checks against external declarations are not reported.

## When to use it

Use it when values can cross realms or should be checked by structure. Prefer a stable discriminant, a structural type guard, or `Schema.is` with a structural schema.

## Conformant

```ts
declare const value: unknown
if (value === null) console.log("null")
```

## Non-conformant

```ts
class Local {}
declare const value: unknown
if (value instanceof Local) console.log("local")
```
