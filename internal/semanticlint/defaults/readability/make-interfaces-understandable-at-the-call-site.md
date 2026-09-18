---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make interfaces understandable at the call site

Prefer explicit parameters and meaningful return values. Avoid calls like `save(record, True, False)`; use named arguments, descriptive options, or separate operations when they clarify intent.
