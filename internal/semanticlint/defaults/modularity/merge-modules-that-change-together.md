---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Merge modules that change together

Consider merging or redrawing boundaries when modules constantly access each other’s internals or must change together. Many tiny files can still form one tightly coupled system.
