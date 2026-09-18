---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not expose internal representations unnecessarily

Return data appropriate to the caller’s task rather than leaking storage-specific records or mutable internal collections. Passing a returned value should not grant accidental access to a module’s private state.
