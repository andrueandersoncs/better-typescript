---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Separate complicated decision-making from external operations

Where it helps, keep calculations and business rules independent of files, databases, and network calls. Do not create extra layers around trivial operations just to enforce this separation.
