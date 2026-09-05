# redundant-alias

## What it does

Reports an empty interface with exactly one extended type. It also reports a differently named type alias when the whole alias is a bare identifier reference or `Omit`, `Partial`, `Pick`, `Readonly`, or `Required` around a bare identifier reference. Intersections, conditionals, qualified generic applications, and other types with additional semantics are allowed. `Schema.Schema.Type<typeof NameSchema>` is allowed as the empty interface heritage.

## When to use it

Use it to stop extra type names that add no invariant or independent boundary.

## Conformant

```ts
interface Customer { name: string }
interface CustomerView extends Customer { label: string }
interface User extends Schema.Schema.Type<typeof UserSchema> {}
type BrandedCustomer = Customer & { readonly CustomerBrand: unique symbol }
type CustomerEvent = Data.TaggedEnum<{ readonly Created: Customer }>
```

## Non-conformant

```ts
interface Customer { name: string }
type CustomerData = Customer
type ReadonlyCustomer = Readonly<Customer>
```
