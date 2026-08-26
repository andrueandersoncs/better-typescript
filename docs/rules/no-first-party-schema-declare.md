# no-first-party-schema-declare

## What it does

Reports bare `Schema.declare(predicate)` when the first predicate call signature asserts a non-callable, non-type-parameter type whose symbol has a first-party interface or class declaration, or a first-party type-alias declaration other than an intersection of multiple parts containing `string`, `number`, `boolean`, `bigint`, or `symbol`.

## When to use it

Keep `Schema.declare` for third-party types and for the allowed primitive-intersection aliases.

## Conformant

```ts
declare const Schema: { Struct: (fields: unknown) => unknown }
export const UserSchema = Schema.Struct({})
```

## Non-conformant

```ts
declare const Schema: { declare: (predicate: unknown) => unknown }
interface User { readonly name: string }
const isUser = (input: unknown): input is User => typeof input === "object"
export const UserSchema = Schema.declare(isUser)
```
