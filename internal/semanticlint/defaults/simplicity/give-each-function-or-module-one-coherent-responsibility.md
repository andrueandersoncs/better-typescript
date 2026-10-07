---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Give each function or module one coherent responsibility

Give functions, modules, and abstractions a purpose that can be described clearly in one sentence; keep closely related behavior together and separate distinct responsibilities that change for unrelated reasons. An abstraction's public operations should describe one recognizable concept. Avoid modules, including `utils`, `common`, or `helpers` modules, that accumulate unrelated responsibilities, and catch-all names such as `Manager`, `Helper`, or `Processor` that obscure them. Split functions into meaningful, well-named operations when that clarifies responsibilities, not merely because they are long.
