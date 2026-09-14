declare const value: { readonly _tag: string }
value._tag === "Ready"
switch (value._tag) { case "Ready": break }
Effect.catch((error: { readonly _tag: string }) => error._tag === "NotFound")
