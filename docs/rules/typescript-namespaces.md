# typescript-namespaces

## What it does

Reports identifier-named TypeScript namespace declarations. The report says: “Avoid TypeScript namespaces for Effect module organization. Export an ES module namespace projection or named values instead.” String-named ambient modules and global scope augmentations are allowed.

## When to use it

Use it when code should use ES module exports instead of TypeScript namespaces.

## Conformant

```ts
export const Models = { user: "user" } as const
```

## Non-conformant

```ts
namespace Models {
  export interface User { readonly id: string }
}
```
