# dependent-layer-merge

## What it does

Reports `Layer.merge` and `Layer.mergeAll` calls when recognized layer arguments form a dependent-provider pair. An argument is recognized only when its type renders with `Layer`, is an object reference with at least three type arguments, and provides output and input channels. A pair is reported only when the provider output and dependent input are not `any`, `unknown`, a type parameter, or `never`, and `isTypeAssignableTo(dependent.input, provider.output)` is true. Use `Layer.provide` to hide the dependency or `Layer.provideMerge` to keep it exposed.

## When to use it

Use this rule to prevent dependent Effect layers from being combined as if they were independent. Independent layers can still use `merge` or `mergeAll`.

## Conformant

```ts
const appLayer = Layer.provide(users, database)
const infrastructure = Layer.merge(database, clock)
```

## Non-conformant

```ts
interface Layer<ROut, E, RIn> {
  readonly out: ROut
  readonly input: (value: RIn) => void
}
interface Database {
  readonly database: unique symbol
}
interface Users {
  readonly users: unique symbol
}
declare const Layer: { merge<A, B>(a: A, b: B): unknown }
declare const database: Layer<Database, never, never>
declare const users: Layer<Users, never, Database>

Layer.merge(database, users)
```
