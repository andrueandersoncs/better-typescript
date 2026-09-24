---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Handle errors explicitly and close to the right boundary

Validate untrusted inputs at boundaries and enforce internal invariants consistently. Handle errors where useful action can be taken, preserving relevant context and explaining what failed. Avoid repeated checks, catch-and-rethrow blocks that add nothing, recovery where meaningful recovery is impossible, and silently swallowed failures or success-shaped defaults unless intentional and clear.
