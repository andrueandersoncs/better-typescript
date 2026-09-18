---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Preserve necessary safeguards

Never remove necessary validation, security controls, or meaningful tests merely to make the codebase smaller. When deleting or weakening assertions, fixtures, snapshots, or cases, identify the protection removed and show that it is obsolete or covered elsewhere.
