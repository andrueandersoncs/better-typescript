---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Choose data structures that reduce special cases

Prefer a clear representation of the problem over scattered flags and loosely related variables. For example, a single `status` value is easier to reason about than several booleans that can contradict one another.
