---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Reuse invariant expensive setup

Do not repeatedly construct the same parser, schema, formatter, lookup table, or configuration inside a loop, render, or frequently called operation when its inputs and required lifetime are invariant.

Do not hoist mutable, request-specific, or short-lived state beyond its owner. Report only when this file repeats demonstrably equivalent setup and safe reuse preserves behavior and ownership.
