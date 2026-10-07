---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Prefer direct calls over hidden dispatch

Prefer direct calls and static references when they express the same behavior. Do not route control flow through string-keyed lookups, computed property access, or events with a single known listener merely to reach one known function.
