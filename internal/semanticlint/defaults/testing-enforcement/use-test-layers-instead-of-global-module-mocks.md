---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Use test Layers instead of global module mocks

Replace capabilities through controlled test Layers; do not use global module mocks. Use virtual time instead of sleeps. When behavior depends on a resource lifecycle, test cleanup, interruption, and resource ownership. Scoped or shared test Layers are allowed when their ownership and isolation are explicit.
