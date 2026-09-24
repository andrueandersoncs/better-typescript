---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make the public interface as small as the contract allows

Keep implementation details private by default; expose only methods, options, and types callers demonstrably need, with narrow parameter lists and few supported modes. Avoid optional parameters or boolean flags that turn one operation into several. Do not expose private helpers, internal folder layouts, database schemas, or cache structures; callers must not import another module's internal files.
