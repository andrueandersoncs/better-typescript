# prefer-result-concept-names

## What it does

Reports a named function, method, or function-valued variable when its inferred name noun disagrees with exactly one property name that is the returned value. Properties inspected in the body or inside a larger returned expression do not count.

## When to use it

Use it to align a callable name with the property it returns.

## Conformant

```ts
interface Customer { readonly name: string }
export const customerName = (customer: Customer): string => customer.name
```

A predicate may inspect a field without being named after it.

```ts
interface Customer { readonly name: string }
export const fieldIsReserved = (customer: Customer): boolean => customer.name === "id"
```

## Non-conformant

```ts
interface Customer { readonly name: string }
export const selectedCustomer = (customer: Customer): string => customer.name
```
