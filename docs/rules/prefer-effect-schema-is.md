# prefer-effect-schema-is

## What it does

Reports strict `===` and `!==` comparisons between `value._tag` and a string literal or no-substitution template literal. It splits unions only: the value type itself, or each union constituent, must have a symbol with a first-party declaration. It does not split intersections. Loose comparisons are allowed.

## When to use it

Use it for first-party tagged values that have an Effect Schema class.

## Conformant

```ts
import { Schema } from "effect"

const Started = Schema.Struct({ _tag: Schema.Literal("Started") })
declare const state: unknown
const active = Schema.is(Started)(state)
```

## Non-conformant

```ts
interface Started { readonly _tag: "Started" }
declare const state: Started
const active = state._tag === "Started"
```
