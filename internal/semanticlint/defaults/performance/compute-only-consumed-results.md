---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Compute only the result the consumer needs

Do not fully sort, filter, clone, or materialize a result when every consumer needs only existence, the first match, a bounded top set, or an aggregate that can be computed without retaining the complete result.

Do not report when full traversal preserves required callback side effects or ordering behavior. Report only when the changed execution path produces unused work or retained data and a partial operation preserves its observable contract.
