---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Prefer composition over cross-module inheritance

Let modules collaborate through small interfaces rather than relying on another module’s inheritance hierarchy or protected internals. A change to a base class should not unexpectedly alter behavior across unrelated modules.

### Interfaces and communication
