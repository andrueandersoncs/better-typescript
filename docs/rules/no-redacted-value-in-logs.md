# no-redacted-value-in-logs

## What it does

Reports a resolved `Redacted.value(...)` that reaches a known Effect, Effect Console, or global console logging call through immediate value-preserving syntax: parentheses and assertions, templates, string concatenation, array elements, object property values, `String`, or single-argument `JSON.stringify`.

## When to use it

Use it to keep `Redacted` values protected at observation boundaries.

The rule does not perform taint analysis. Values stored in variables, custom loggers, authentication requests, property reads such as `.length`, opaque transformations, and `JSON.stringify` calls with a replacer are outside its scope.

## Conformant

```ts
import { Effect, Redacted } from "effect"

const token = Redacted.make("token")
Effect.logInfo(token)
```

## Non-conformant

```ts
import { Effect, Redacted } from "effect"

const token = Redacted.make("token")
Effect.logInfo(Redacted.value(token))
```
