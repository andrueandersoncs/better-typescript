---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Split or merge based on cohesion and coupling—not line counts

Split a module when it contains independently changing responsibilities. Consider merging or redrawing boundaries when modules constantly access each other’s internals or must change together. Many tiny files can still form one tightly coupled system.
