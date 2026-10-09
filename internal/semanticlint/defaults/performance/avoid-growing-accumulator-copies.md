---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Avoid copying a growing accumulator

Report a loop over growing input that copies its prior accumulated array or object on every iteration, such as `acc = [...acc, item]`, `acc = acc.concat(item)`, or `acc = { ...acc, [key]: value }`. Prefer one-pass non-mutating construction such as mapping or grouping when intermediate accumulator identities are not observable. Use a locally owned mutable builder only when truly necessary and explicitly excluded by project policy from `no-mutation` and, for arrays, `no-mutable-array-methods`. Do not report fixed small inputs, required immutable intermediate snapshots, or code that does not copy prior accumulation each iteration.
