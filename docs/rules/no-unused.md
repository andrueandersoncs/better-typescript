# no-unused

## What it does

Reports TypeScript semantic diagnostics for unused imports, declarations, and parameters. It follows compiler suppression, so the tested `@ts-ignore` case is allowed. Exported declarations that the compiler does not mark unused are also allowed.

## When to use it

Use it to remove dead names. Prefix a required but intentionally unused parameter with an underscore.

## Conformant

```ts
// @ts-ignore
const intentionallyUnused = 1
export const availableToOtherModules = 2
```

## Non-conformant

```ts
const unusedValue = 1
export {}
```
