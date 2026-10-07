---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep each fact in one authoritative place

Store each business rule, schema, default, configuration value, and other fact in one authoritative place, and derive secondary values when practical instead of synchronizing copies. Enforce each data invariant consistently in one place rather than in several modules or with repeated checks.
