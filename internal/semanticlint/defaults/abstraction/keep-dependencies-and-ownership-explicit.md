---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep dependencies and ownership explicit

Make it clear which collaborators the abstraction requires and who creates, owns, and releases resources. Avoid hidden global state or implicit service lookup that makes behavior depend on invisible setup.
