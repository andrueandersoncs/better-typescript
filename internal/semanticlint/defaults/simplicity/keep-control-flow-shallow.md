---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep control flow shallow

Use guard clauses and early returns for invalid inputs and exceptional cases when they simplify logic and leave the normal operation easy to follow, without unnecessary indentation. Avoid deeply nested conditions, hidden side effects, and elaborate chains that obscure execution; do not return early merely for its own sake.
