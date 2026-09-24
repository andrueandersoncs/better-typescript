---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Avoid copying a growing accumulator

Do not rebuild a growing array or object on every iteration with spread,
concatenation, or an equivalent full copy. Prefer one-pass non-mutating library
construction (such as mapping or grouping) when intermediate accumulator
identities are not observable. Use a locally owned mutable builder only if
truly necessary and explicitly excluded by project policy from `no-mutation`
and, for array methods, `no-mutable-array-methods`.

Do not report fixed small inputs or code that must preserve immutable
intermediate snapshots. Report only when each iteration copies values
accumulated by earlier iterations and the work grows with input size.
