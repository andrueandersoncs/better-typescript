---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Replace unexplained values with meaningful names

Use `MAX_RETRY_ATTEMPTS` instead of an unexplained `3` when the value represents a policy or domain concept. Do not create constants for every obvious literal.
