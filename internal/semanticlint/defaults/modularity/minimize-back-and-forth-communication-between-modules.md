---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Minimize back-and-forth communication between modules

When a simple task requires many calls across a boundary, reconsider where the behavior belongs. Expose meaningful operations such as `reserveInventory(items)` and move cohesive work behind one operation rather than making callers coordinate a sequence of low-level mutations. Do not solve this by creating a giant catch-all method.
