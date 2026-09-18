---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not nest if statements

Never place an `if` statement inside another `if` branch. Prefer sequential guard
clauses with early returns. Independent guard clauses and a single two-way
`if`/`else` are compliant.
