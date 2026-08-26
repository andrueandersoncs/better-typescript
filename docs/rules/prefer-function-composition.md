# prefer-function-composition

## What it does

Reports three narrow arrow shapes. An ordinary block must have exactly two statements: one `const` declaration with a non-function initializer, then a return that uses it once through unary calls or `pipe`. An Effect block must have at least two single-`const` bindings, a first initializer whose type contains `Effect<`, exact single-use threading through the bindings, and an exact `Effect.runPromise(last)` return. An adapter must be expression-bodied, have exactly one typed identifier parameter, and have the shape `partial(arg)(value.property)`, where `partial` is a bare identifier and each call has one argument. A direct `step(value)` call is allowed.

## When to use it

Use it to prefer `pipe`, `flow`, or Function combinators over manually threaded values.

## Conformant

```ts
declare const step: (x: number) => number
export const composed = (value: number) => step(value)
```

## Non-conformant

```ts
declare const step: (x: number) => number
export const composed = (value: number) => {
  const next = value + 1
  return step(next)
}
```
