---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Handle errors explicitly and close to the right boundary

Handle errors where useful action can be taken. Avoid catch-and-rethrow blocks that add nothing and recovery where meaningful recovery is impossible.
