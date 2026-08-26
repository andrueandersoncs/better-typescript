# prefer-specific-operation-names

## What it does

Reports `do`, `execute`, `handle`, `manage`, `process`, or `run` when a function body has one clear role. The message proposes a specific replacement while keeping the noun.

## When to use it

Use it for named functions, methods, and function-valued variables. Bodies with no unique role are allowed.

## Conformant

```ts
interface Customer { readonly id: string }
declare const decode: (input: unknown) => Customer
export const decodeCustomer = (input: unknown): Customer => decode(input)
```

## Non-conformant

```ts
interface Customer { readonly id: string }
declare const decode: (input: unknown) => Customer
export const processCustomer = (input: unknown): Customer => decode(input)
```
