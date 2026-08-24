import { Schema } from "effect"
class FetchError extends Schema.TaggedErrorClass<FetchError>()("FetchError", {}) {}
