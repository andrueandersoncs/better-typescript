---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Minimize back-and-forth communication between modules

When a simple task requires many calls across a boundary, reconsider where the behavior belongs. Move cohesive work behind one meaningful operation rather than distributing the workflow across callers. Do not solve this by creating a giant catch-all method.
