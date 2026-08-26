# schema-error-class

## What it does

Reports named error-like classes that use an exact `_tag` property or a `Data`-style error base instead of a recognized Schema error class. Error-like names end in `Error`, `Failure`, or `Exception`; extending `Error` also qualifies.

It reports exactly: `Use Schema.TaggedErrorClass for typed Effect errors. Map boundary failures into a tagged schema error with useful operation context.` A class extending a Schema-qualified `TaggedErrorClass`, `ErrorClass`, or `TaggedError` is allowed. Classes without an exact `_tag` property or supported error base are also allowed.

## When to use it

Use it when typed Effect errors should use Schema error classes and boundary failures should carry useful operation context.

## Conformant

The fixture allows a Schema tagged error class and a class with an unrelated computed property:

```ts
import { Schema } from "effect"
class FetchError extends Schema.TaggedErrorClass<FetchError>()("FetchError", {}) {}

declare const key: unique symbol
class Computed { readonly [key] = true }
```

## Non-conformant

The fixture reports an `Error` subclass with an exact `_tag` property:

```ts
class FetchError extends Error { readonly _tag = "FetchError" }
```
