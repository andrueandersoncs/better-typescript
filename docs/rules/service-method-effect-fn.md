# service-method-effect-fn

## What it does

Reports named functions whose return type is an Effect on every path and that are not defined with `Effect.fn`, plus recursively found methods and object properties in any class whose source contains `Context.Service`.

The report is: `Wrap public Effect service operations with a named Effect.fn. Name the operation Domain.operation and keep the generator body focused on its workflow.`

Named functions are function declarations and `const` variables initialized with an arrow function or function expression, exported or not. They qualify when they are neither generators nor `async` and the checker's return type, or every member of a union return type, renders as `Effect<...>`. A function that sometimes returns a non-Effect value, a non-function value such as `const task = Effect.succeed(1)`, a `let` binding, an interface signature, and an inline callback passed to an Effect combinator are not reported. A variable is allowed when its initializer contains a recognized `Effect.fn` call whose first argument is a string literal. A function containing `Effect.gen(...)` is left to `prefer-effect-fn`, so the two rules do not report the same function.

In a class whose source text contains `Context.Service`, the recursive walk checks method declarations and object property and shorthand assignments. It does not check direct class property declarations. A member qualifies when its rendered type contains `Effect<` or its subtree contains any property call on the imported `Effect` namespace, and it is allowed when it contains a named `Effect.fn` or any `Effect.gen` call.

## When to use it

Use it to give Effect-returning operations stable `Domain.operation` names.

## Conformant

```ts
import { Effect } from "effect"

export const fetchUser = Effect.fn("User.fetch")(function* () {
  return yield* Effect.succeed("user")
})
```

## Non-conformant

```ts
import { Effect } from "effect"

export const fetchUser = () => Effect.succeed("user")

function loadUser(id: string) {
  return Effect.succeed(id)
}
```
