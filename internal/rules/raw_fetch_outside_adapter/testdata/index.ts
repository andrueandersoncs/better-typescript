declare const Effect: { tryPromise<A>(f: () => Promise<A>): unknown }
fetch("/bad")
Effect.tryPromise(() => fetch("/ok"))
