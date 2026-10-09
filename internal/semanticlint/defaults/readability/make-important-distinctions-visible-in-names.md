---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make important distinctions visible in names

Report a name that omits a unit or representation when it could be confused, such as `timeout` for milliseconds, `price` for cents, or `created_at` for a UTC timestamp. Do not report a name when its unit or representation cannot reasonably be confused.
