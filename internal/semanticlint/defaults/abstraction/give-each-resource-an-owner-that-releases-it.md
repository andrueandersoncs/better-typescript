---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Give each resource an owner that releases it

Apply this policy only to code that acquires a resource or runtime with a `close`, `release`, `dispose`, or `end` operation. A file that only transforms plain data cannot violate it.

The code that acquires a resource must attach its release. Report any of these shapes:

- an exported function or Effect that hands an open handle to its caller with no finalizer, such as `(): Effect.Effect<Handle, OpenError> => Effect.try({ try: () => connect(), catch: toError })` or `Effect.sync(() => connect())`; nothing in it ever calls `handle.close()`;
- a function that returns or stores a fresh resource, such as `createServer()` or `new Runtime()`, with no release path.

Do not report acquisition tied to its release, such as `Effect.acquireRelease`, `Effect.acquireUseRelease(acquire, use, release)`, `Layer.scoped`, `using`, or `try { ... } finally { resource.close() }`. Declaring a type with a `close` method is not acquisition.
