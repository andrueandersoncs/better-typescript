---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep public interfaces small, explicit, and task-focused

Expose meaningful operations such as `reserveInventory(items)` rather than making callers coordinate a sequence of low-level mutations. Specify inputs, outputs, errors, and side effects. Avoid making callers know the “correct secret order” of method calls.
