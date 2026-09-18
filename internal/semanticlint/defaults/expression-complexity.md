---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep expressions shallow

An expression must not nest operators or function calls more than two levels
deep. Break deeper calculations into descriptively named intermediate values.

Object and array literals used to construct structured data do not add expression
depth by themselves.