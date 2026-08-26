# no-async-functions

## What it does

Reports the `async` keyword on function declarations, function expressions, arrow functions, and methods. The report says: “Avoid declaring functions as async. Model asynchronous work with Effect instead of async/await. To integrate with a third-party library: wrap incoming promises with Effect.tryPromise; satisfy an outgoing Promise-returning callback contract with a non-async function that returns Effect.runPromise(effect).” Non-async functions may return a Promise.

## When to use it

Use it when asynchronous work must be modeled with Effect.

## Conformant

```ts
export function load(): Promise<number> {
  return Promise.resolve(1)
}
```

## Non-conformant

```ts
export async function load(): Promise<number> {
  return 1
}
```
