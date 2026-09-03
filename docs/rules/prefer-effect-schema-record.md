# prefer-effect-schema-record

## What it does

Reports every tuple type alias. It also reports an interface or object type alias when a project `.ts` file constructs that type with a contextually typed object literal. Object declarations with no detected construction and runtime records with callable properties are allowed.

## When to use it

Use it to model constructed first-party data as a named `Schema.Struct` record. Keep process-bound runtime values as boundary types or explicit runtime data.

## Conformant

```ts
import { Schema } from "effect"

export const CoordinateSchema = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
})
export interface Coordinate extends Schema.Schema.Type<typeof CoordinateSchema> {}

const origin = CoordinateSchema.make({ x: 0, y: 0 })
```

## Non-conformant

```ts
type Coordinate = [number, number]
```
