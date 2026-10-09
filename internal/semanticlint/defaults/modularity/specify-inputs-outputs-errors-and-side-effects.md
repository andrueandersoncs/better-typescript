---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Specify inputs, outputs, errors, and side effects

Report an exported operation whose signature and doc comment do not together state its inputs, result, failures, and side effects. Report an exported function with no declared return type, and an exported operation, factory, or function type that delegates I/O, such as `store.put(user)` on an injected client, with no doc comment naming that side effect, even when typed as `Effect.Effect<A, E>`. Do not report non-exported code, data-only types, or pure functions whose annotated types fully describe them and that cannot fail.
