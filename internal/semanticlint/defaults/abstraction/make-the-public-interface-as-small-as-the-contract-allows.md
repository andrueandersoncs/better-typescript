---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make the public interface as small as the contract allows

Keep implementation details private by default. Every public method, option, and exposed type should serve a demonstrated caller need; do not expose internal machinery merely because it already exists.
