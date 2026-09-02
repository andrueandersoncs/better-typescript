# redundant-alias

## What it does

Reports an empty interface with exactly one extended type, and reports a differently named type alias whenever its type text starts with a reference token, optionally inside Omit, Partial, Pick, Readonly, or Required; trailing type syntax is not checked. `Schema.Schema.Type<typeof NameSchema>` is allowed as the empty interface heritage and as the whole alias type. For the tested alias, it reports: `CustomerData renames Customer without adding independent semantics.` An interface that adds a member is allowed.

## When to use it

Use it to stop extra type names that add no invariant or independent boundary.

## Conformant

```ts
interface Customer { name: string }
interface CustomerView extends Customer { label: string }
interface User extends Schema.Schema.Type<typeof UserSchema> {}
```

## Non-conformant

```ts
interface Customer { name: string }
type CustomerData = Customer
```
