---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep variants of one thing together

Report a file that separates variants of one thing with unrelated declarations: for example, overloads of `lookupUser`, handlers for one `UserEvent` union, routes from one router, or tests of `parseOrder` placed in distant sections. Do not report adjacent unrelated declarations, or variants already kept together.
