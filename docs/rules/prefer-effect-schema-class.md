# prefer-effect-schema-class

## What it does

Reports a tuple type alias whose target is a tuple after removing `readonly` and parentheses. It also reports an interface or object type alias when a project `.ts` file constructs that type with a contextually typed object literal. Object declarations with no detected construction and runtime records with callable properties are allowed.

## When to use it

Use it to model constructed first-party data as an Effect `Schema.Class` with named fields. Use `Schema.TaggedClass` for tagged variants. Keep process-bound runtime values as boundary types or explicit runtime data.

## Conformant

```ts
import { Schema } from "effect"

export class Coordinate extends Schema.Class<Coordinate>("Coordinate")({
  x: Schema.Number,
  y: Schema.Number,
}) {
  static origin(): Coordinate {
    return Coordinate.make({ x: 0, y: 0 })
  }
}
```

## Non-conformant

```ts
interface User {
  readonly name: string
}

const user: User = { name: "Ada" }

type Coordinate = [number, number]
```
