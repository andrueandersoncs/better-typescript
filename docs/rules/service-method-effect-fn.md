# service-method-effect-fn

## What it does

Reports qualifying syntactically exported variables/functions, plus recursively found methods and object properties in any class whose source contains `Context.Service`; class members are checked without an accessibility filter. A value is allowed when its subtree contains a recognized `Effect.fn` call whose first argument is a string literal, or any recognized `Effect.gen` call.

The report is: `Wrap public Effect service operations with a named Effect.fn. Name the operation Domain.operation and keep the generator body focused on its workflow.`

The rule checks exported variables and exported function declarations. In a class whose source text contains `Context.Service`, its recursive walk checks method declarations and object property and shorthand assignments. It does not check direct class property declarations. The walk can also find nested object properties. A value qualifies when its rendered type contains `Effect<` or its subtree contains any property call on the imported `Effect` namespace. The fallback does not verify that the called method returns an Effect. A string literal must be the first `Effect.fn` argument. Standalone non-exported operations and operations containing `Effect.gen(...)` are allowed.

## When to use it

Use it to give public Effect service operations stable `Domain.operation` names.

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
```
