---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Minimize mutable and duplicated state

Keep state local with a clear owner. Store each business rule, schema, default, configuration value, and other fact in one authoritative place; derive secondary values when practical instead of synchronizing copies.
