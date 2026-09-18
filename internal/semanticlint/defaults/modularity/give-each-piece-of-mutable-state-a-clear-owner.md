---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Give each piece of mutable state a clear owner

Other modules should request changes through the owner’s interface rather than modifying its data directly. Avoid shared mutable globals and multiple modules independently enforcing the same data invariants.

### Dependencies
