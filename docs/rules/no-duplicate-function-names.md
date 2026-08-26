# no-duplicate-function-names

## What it does

Reports top-level functions with the same name and mutually assignable signatures in different project files. It checks function declarations and variables initialized with functions or arrow functions.

## When to use it

Use it to find same-name, mutually assignable top-level callables in different files as candidates for consolidation. The rule does not compare bodies or establish semantic equivalence. Types that are not mutually assignable in both directions are allowed.

## Conformant

```ts
// user.ts
function shared(value: number): number {
  return value
}

// account.ts
function shared(value: string): string {
  return value
}
```

## Non-conformant

```ts
// first.ts
function shared(value: string): string {
  return value
}

// second.ts
function shared(value: string): string {
  return value
}
```
