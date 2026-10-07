---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make the public interface as small as the contract allows

Keep implementation details private by default; expose only the methods, options, and types callers demonstrably need, with narrow parameter lists. Do not expose private helpers, internal folder layouts, storage layouts, transport mechanics, database schemas, or cache structures.
