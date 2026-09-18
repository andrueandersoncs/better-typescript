---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Define Effect-returning functions with Effect.fn

When a named function always returns an `Effect`, define it with `Effect.fn` instead of a function declaration or arrow whose body only constructs and returns that `Effect`.

Prefer `const someFunc = Effect.fn("someFunc")((value) => Effect.succeed(value))` over `function someFunc(value) { return Effect.succeed(value); }`. Generator bodies may use `Effect.fn("someFunc")(function* (...) { ... })`.

Do not report callbacks passed directly to Effect combinators, interface signatures without an implementation, or functions that sometimes return a non-Effect value.
