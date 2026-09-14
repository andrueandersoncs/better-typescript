declare const outside: { readonly _tag: string }
Effect.catch((error) => error._tag === "NotFound" ? recover : fail)
Effect.catchAll((error) => error.reason._tag === "Timeout" ? retry : fail)
outside._tag === "Ready"
