---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not promise interchangeability you cannot deliver

Report a shared contract when an implementation cannot provide a guarantee the contract presents as universal. Examples: an `IterableStore` whose `remove()` throws `UnsupportedOperationError`, or a `Cache` implementation with weaker persistence than the interface promises. Report the mismatched guarantee, not merely different internals. Do not report implementations that honor the stated contract, contracts narrowed to their common guarantees, or separately exposed capability differences such as `ReadonlyStore` versus `MutableStore`.
