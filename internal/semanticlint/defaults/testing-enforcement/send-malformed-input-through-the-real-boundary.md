---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e,fixtures}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Send malformed input through the real boundary

Deliberately malformed test input must enter through the real untrusted-input boundary instead of masquerading as a valid domain value.
