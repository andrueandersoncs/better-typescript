---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e,fixtures}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep test fixtures type checked

Valid fixtures, fakes, and builders must satisfy their declared types without broad escape casts. Deliberately malformed input must enter through the real untrusted-input boundary instead of masquerading as a valid domain value.

Narrow casts that model an unavoidable external boundary require a specific justification.