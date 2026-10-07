---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Give background tasks an owner

Every background task must have an explicit owner whose lifetime encloses it and who is responsible for its interruption and shutdown. Observe background failures.

Report only when this file detaches work without such an owner or ignores its failures.
