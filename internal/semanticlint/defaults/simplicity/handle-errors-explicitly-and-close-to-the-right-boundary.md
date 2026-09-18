---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Handle errors explicitly and close to the right boundary

Validate untrusted inputs at boundaries and enforce internal invariants consistently. Avoid repeated checks, catch-and-rethrow blocks that add nothing, silent fallbacks that hide failures, and recovery where meaningful recovery is impossible.
