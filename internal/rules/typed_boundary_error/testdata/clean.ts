import { Effect } from "effect"
declare const operation: unknown
class LoadError { readonly _tag = "LoadError" }
Effect.catchAll(operation, () => Effect.fail(new LoadError()))
