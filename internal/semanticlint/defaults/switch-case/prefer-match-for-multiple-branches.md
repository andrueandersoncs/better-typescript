---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Prefer Match for multiple branches

Prefer exhaustive Effect `Match` for suitable multiway branches over the same
tagged or discriminant value. Readable `if`/`else if` chains may remain for
heterogeneous conditions; use simple conditionals for boolean branches. Do not
recommend `switch`, which `no-switch-statements` forbids.
