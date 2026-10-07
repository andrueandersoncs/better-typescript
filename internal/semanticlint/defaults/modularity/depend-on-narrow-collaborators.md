---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Depend on narrow collaborators

Depend on the narrowest collaborator that provides what is needed. A module that needs a clock should receive a clock, not the entire application or an application-wide context object.
