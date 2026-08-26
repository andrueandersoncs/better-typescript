# prefer-effect-property-accessors

## What it does

Reports a one-argument function whose only result is a direct property read from that argument. The tested report says: `Avoid defining getName only to read user.name.` It recommends `Struct.get("name")`, or `Record.get` for record types.

Optional property access is allowed.

## When to use it

Use it for small reusable property accessors.

## Conformant

```ts
const getName = (user: { readonly name?: string }) => user?.name
```

## Non-conformant

```ts
const getName = (user: { readonly name: string }) => user.name
```
