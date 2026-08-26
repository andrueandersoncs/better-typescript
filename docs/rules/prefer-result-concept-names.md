# prefer-result-concept-names

## What it does

Reports a named function, method, or function-valued variable when its inferred name noun disagrees with exactly one property name found in return expressions, or, if none is found there, anywhere in the body. The fallback can count a property that is not returned.

## When to use it

Use it to align a callable name with the single property that the rule finds. Its whole-body fallback may count a property that is not returned.

## Conformant

```ts
interface Customer { readonly name: string }
export const customerName = (customer: Customer): string => customer.name
```

## Non-conformant

```ts
interface Customer { readonly name: string }
export const selectedCustomer = (customer: Customer): string => customer.name
```
