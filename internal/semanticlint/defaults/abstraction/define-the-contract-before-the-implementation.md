---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Define the contract before the implementation

Specify accepted inputs, outputs, invariants, side effects, failure behavior, and relevant lifecycle rules. Callers should be able to use it correctly without reading its internals.
