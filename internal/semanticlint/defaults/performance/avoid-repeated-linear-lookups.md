---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Avoid repeated linear lookups in variable loops

Do not run `find`, `filter`, `includes`, or another linear search over the same collection for every item of a variable-size outer loop when one reusable index can preserve equality, duplicate, and ordering behavior.

Do not report small fixed collections, lookup data that changes each iteration, or cases where indexing would change observable semantics. Report only when repository evidence shows repeated scans of stable lookup data at variable input scale.
