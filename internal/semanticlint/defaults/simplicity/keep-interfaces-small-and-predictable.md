---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep interfaces small and predictable

Expose only what callers need. Keep implementation details private by default, parameter lists narrow, and supported modes few; avoid optional parameters or boolean flags that turn one operation into several.
