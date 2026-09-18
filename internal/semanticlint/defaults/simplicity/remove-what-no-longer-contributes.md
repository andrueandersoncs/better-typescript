---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Remove what no longer contributes

Delete unused functions, imports, dependencies, obsolete feature flags, superseded implementations, and commented-out code. When replacing an implementation, remove the old path and its support code without expanding the change into an unrelated refactor. Version control is the archive.
