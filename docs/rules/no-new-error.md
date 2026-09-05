# no-new-error

## What it does

Reports direct `new Error(...)` expressions. It recommends declaring a custom Effect Schema error and constructing it with its static `make` method.

## When to use it

Use this rule when code must create named error types instead of bare `Error` values. This rule does not report other constructors; `prefer-effect-schema-constructor` separately reports `new` on Effect Schema classes.

## Conformant

```ts
class CustomError extends Error {}
const error = new CustomError()
```

For an Effect Schema error, use its constructor API:

```ts
import { Schema } from "effect"

class Failure extends Schema.TaggedErrorClass<Failure>()("Failure", {}) {}
const failure = Failure.make()
```

## Non-conformant

```ts
const error = new Error("failure")
```
