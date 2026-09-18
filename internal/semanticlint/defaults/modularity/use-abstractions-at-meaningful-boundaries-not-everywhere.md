---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Use abstractions at meaningful boundaries—not everywhere

Introduce a contract when it isolates an external system, supports real variation, or separates responsibilities. Do not create an interface and factory for every class merely to make the code look modular.
