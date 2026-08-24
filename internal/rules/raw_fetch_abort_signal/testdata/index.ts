declare const Effect: { tryPromise<A>(f: (signal: AbortSignal) => Promise<A>): unknown }
Effect.tryPromise((signal) => fetch("/bad"))
Effect.tryPromise((signal) => fetch("/ok", { signal }))
