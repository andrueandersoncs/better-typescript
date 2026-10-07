---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make interfaces understandable at the call site

Prefer explicit parameters and meaningful return values. Avoid calls whose arguments cannot be understood where they are written, such as `resize(image, 300, 200, 90)`; use named arguments or descriptive options when they clarify intent.

Arguments that switch one operation between modes are out of scope; `do-not-force-variation-through-flags` covers them.
