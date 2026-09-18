---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Treat public contracts as promises

Preserve documented behavior when changing internals. Changes to error behavior, ordering guarantees, or side effects can break callers even when function signatures stay the same. Make breaking changes intentional and coordinate them with consumers.

### Implementation and maintenance
