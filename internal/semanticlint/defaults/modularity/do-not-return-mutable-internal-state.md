---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not return mutable internal state

Do not return mutable internal collections or other values whose use grants accidental access to a module’s private state.
