# prefer-context-service-class

## What it does

Reports `Service(...)` calls with an argument when `Service` resolves to the `effect` package. It asks for a class extending `Context.Service`, with the service interface passed as the `Shape` type parameter.

A tested call with no argument is allowed. Local functions that only look like `Service` are also allowed.

## When to use it

Use it when Effect service definitions should use the class form of `Context.Service`.

## Conformant

```ts
import { Context } from "effect"

const UserRepo = Context.Service<{ readonly get: () => string }>()
```

## Non-conformant

```ts
import { Context } from "effect"

const UserRepo = Context.Service<{ readonly get: () => string }>("UserRepo")
```
