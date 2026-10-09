---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Reuse invariant expensive setup

Report repeated construction of the same parser, schema, formatter, lookup table, or configuration inside a loop, render, or frequently called operation when its inputs and required lifetime are invariant and safe reuse preserves behavior and ownership. Examples: `new RegExp(pattern)`, `Schema.Struct(fields)`, `new Intl.DateTimeFormat()`, or `new Map(entries)` recreated on every iteration or render. Do not report mutable, request-specific, or short-lived state that must remain with its owner.
