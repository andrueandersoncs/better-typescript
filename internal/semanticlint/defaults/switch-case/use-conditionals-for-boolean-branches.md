---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Use conditionals for boolean branches

Use a simple conditional or `if`/`else` for two-way boolean branches. Do not
replace them with `switch`; use Effect `Match` for suitable tagged multiway
branches instead.
