---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep each invariant under one authority

An abstraction should own the rules it promises to enforce. Do not require callers to duplicate its validation, reconstruct its state, or coordinate competing sources of truth to preserve correctness.
