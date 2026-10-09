---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not nest if statements

Report an `if` statement inside either branch of another `if`, such as `if (ready) { if (isAdmin) allow() }`. Prefer sequential guard clauses with early returns. Do not report independent guard clauses or one two-way `if`/`else`.
