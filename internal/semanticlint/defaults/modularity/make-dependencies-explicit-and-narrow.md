---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make dependencies explicit and narrow

Pass required collaborators through function arguments or constructors. Avoid hidden dependencies through global registries, service locators, or application-wide context objects. A module that needs a clock should receive a clock, not the entire application.
