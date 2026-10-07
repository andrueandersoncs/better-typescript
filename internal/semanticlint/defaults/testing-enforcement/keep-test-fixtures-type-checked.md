---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e,fixtures}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep test fixtures type checked

Valid fixtures, fakes, and builders must satisfy their declared types without broad escape casts.

Narrow casts that model an unavoidable external boundary require a specific justification.
