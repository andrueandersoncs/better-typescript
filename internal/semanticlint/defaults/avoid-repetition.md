---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Avoid repeated logic

Do not duplicate the same multi-step decision, transformation, or formatting
algorithm. Introduce a shared function when duplicated behavior must change in
lockstep.

Repeated Effect composition, guard clauses, and uses of the same domain label
in different contexts are not violations.