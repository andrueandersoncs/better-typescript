---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Give each piece of mutable state a clear owner

Keep mutable state local with a clear owner. Other modules request changes through the owner’s interface rather than modifying its data directly. Avoid shared mutable globals.
