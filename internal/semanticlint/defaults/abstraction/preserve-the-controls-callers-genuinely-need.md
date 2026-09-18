---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Preserve the controls callers genuinely need

Where relevant, support cancellation, timeouts, resource cleanup, and useful diagnostics. Avoid sealing the implementation so tightly that ordinary operational requirements require bypassing the abstraction—but do not add unrestricted escape hatches preemptively.

### Verify that it earns its place
