import { Schema } from "effect"
class FetchError extends Schema.TaggedErrorClass<FetchError>()("FetchError", {}) {}

declare const key: unique symbol
class Computed { readonly [key] = true }
