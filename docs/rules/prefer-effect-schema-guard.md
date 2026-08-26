# prefer-effect-schema-guard

## What it does

Reports a string or no-substitution template literal used as `key in value` anywhere in an `if` condition. It allows dynamic keys and checks outside `if` conditions.

## When to use it

Use it to replace ad hoc property guards with `Schema.is` and an Effect Schema.

## Conformant

```ts
import { Schema } from "effect"

const Named = Schema.Struct({ name: Schema.String })
declare const value: unknown
if (Schema.is(Named)(value)) console.log(value.name)
```

## Non-conformant

```ts
declare const value: object
if ("name" in value) console.log(value)
```
