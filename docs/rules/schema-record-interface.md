# schema-record-interface

## What it does

Reports an identifier initialized by Effect's `Schema.Struct` when its symbol is not paired with an interface named by removing the `Schema` suffix. The pair must extend the genuine `Schema.Schema.Type<typeof NameSchema>` and refer to the same schema symbol. A nested interface can pair with an outer schema when it references that symbol.

The exact report is: `Pair a Schema.Struct record with its decoded interface. For UserSchema, export interface User extends Schema.Schema.Type<typeof UserSchema> beside the schema declaration.` This text also reports `UserSchema` when the violating schema has another name.

A local object named `Schema` and `Equivalence.Struct` are allowed. A local imitation of `Schema.Schema.Type` does not count.

## When to use it

Use it to keep every Effect record schema beside its decoded interface.

## Conformant

```ts
import { Schema } from "effect"

export const UserSchema = Schema.Struct({ id: Schema.String })
export interface User extends Schema.Schema.Type<typeof UserSchema> {}
```

## Non-conformant

```ts
import { Schema } from "effect"

export const UserSchema = Schema.Struct({ id: Schema.String })
```
