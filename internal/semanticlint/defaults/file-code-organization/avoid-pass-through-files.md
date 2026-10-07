---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Avoid pass-through files

Do not add a file or directory whose only content forwards to one other module, such as a single-use re-export barrel or a module that re-exports one implementation unchanged.

A package entry point that collects the public exports of several modules is not a pass-through file.
