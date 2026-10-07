---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make dependencies explicit

Make the collaborators and inputs a function, module, or abstraction requires visible, passing them through arguments or constructors. Avoid hidden global state, hidden input or output, global registries, service locators, and implicit service lookup that make behavior depend on invisible setup.
