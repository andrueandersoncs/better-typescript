---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep implementation details private by default

Expose only what other modules need. Callers should not depend on private helpers, internal folder layouts, database schemas, or cache structures. Prohibit imports into another module’s internal files.
