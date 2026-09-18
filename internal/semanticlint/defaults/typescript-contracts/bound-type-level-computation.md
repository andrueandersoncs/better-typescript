---
globs:
  - "**/*.{ts,tsx}"
---
# Bound type-level computation

Recursive conditional types, large unions or intersections, schema inference, and generic exported APIs must stay within the repository's compiler budget. Prefer a named public type or a simpler equivalent contract when compiler diagnostics attribute excessive work to the changed type.

Do not report sophisticated types from syntax alone. Report only when supplied diagnostics or trace evidence ties a compiler-budget violation to the changed type-level computation.
