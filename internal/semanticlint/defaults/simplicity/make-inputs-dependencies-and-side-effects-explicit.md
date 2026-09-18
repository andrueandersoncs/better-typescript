---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make inputs, dependencies, and side effects explicit

Avoid functions that secretly depend on global state or unexpectedly modify their inputs. Make database writes, network calls, and other external effects easy to identify.
