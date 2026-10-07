---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Model expected failures with specific types

Model each expected failure with a specific tagged error type; do not use universal error types. When adapting a Promise rejection or thrown exception, map each expected failure to its specific type.
