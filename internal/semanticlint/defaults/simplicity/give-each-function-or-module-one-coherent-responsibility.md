---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Give each function or module one coherent responsibility

Give functions and modules a purpose that can be described clearly in one sentence; keep closely related behavior together and separate distinct responsibilities that change for unrelated reasons. Split functions into meaningful, well-named operations when that clarifies responsibilities, not merely because they are long; avoid modules that accumulate miscellaneous business logic.
