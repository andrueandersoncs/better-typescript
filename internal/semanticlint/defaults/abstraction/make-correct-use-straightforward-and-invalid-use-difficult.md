---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make correct use straightforward and invalid use difficult

Prefer representations and operations that enforce invariants over documentation that asks callers to remember them. Validate at the appropriate boundary, avoid unnecessary call-order requirements, and provide defaults only when they are genuinely safe.
