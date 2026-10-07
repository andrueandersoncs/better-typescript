---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Assert absence only after the operation completes

Make negative assertions only after the operation could have produced the forbidden result.

Report only when a test in this file can assert absence before the relevant operation completes.
