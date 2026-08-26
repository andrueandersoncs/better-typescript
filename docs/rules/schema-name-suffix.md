# schema-name-suffix

## What it does

Reports a `const` identifier whose type is a complete Effect Schema v3 or v4 type when its name does not end in `Schema`. It checks direct declarations and `const` destructuring, including nested destructuring.

For `Account`, the exact report is: `Account is an Effect Schema const without a Schema suffix. Rename it to AccountSchema and update its references. Name the decoded interface Account and extend Schema.Schema.Type<typeof AccountSchema>.`

Names ending in `Schema` are allowed. So are `let` bindings, parameter bindings, local lookalikes, and partial Effect Schema types.

## When to use it

Use it to give schema values a visible suffix and reserve the unsuffixed name for the decoded interface.

## Conformant

```ts
import { Schema } from "effect"

export const UserSchema = Schema.Struct({ name: Schema.String() })
export interface User extends Schema.Schema.Type<typeof UserSchema> {}

let Mutable = UserSchema
```

## Non-conformant

```ts
import { Schema } from "effect"

export const Account = Schema.Struct({ name: Schema.String() })
const schemas = { User: Schema.String() }
const { User } = schemas
```
