---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Preserve the controls callers genuinely need

Where relevant, support cancellation, timeouts, resource cleanup, and useful diagnostics. Do not seal the implementation so tightly that ordinary operational requirements require bypassing the abstraction.
