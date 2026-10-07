---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Use test Layers instead of global module mocks

Replace capabilities through controlled test Layers; do not use global module mocks. Scoped or shared test Layers are allowed when their ownership and isolation are explicit.
