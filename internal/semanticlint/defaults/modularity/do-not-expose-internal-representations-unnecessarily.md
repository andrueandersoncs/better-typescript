---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not expose internal representations unnecessarily

Return data appropriate to the caller’s task rather than storage-specific records, and expose only the fields callers need.
