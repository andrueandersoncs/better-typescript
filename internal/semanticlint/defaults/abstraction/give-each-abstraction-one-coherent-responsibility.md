---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Give each abstraction one coherent responsibility

An abstraction's public operations should describe a recognizable concept at a consistent level of detail. Avoid catch-all names such as `Manager`, `Helper`, or `Processor` when they obscure unrelated responsibilities.
