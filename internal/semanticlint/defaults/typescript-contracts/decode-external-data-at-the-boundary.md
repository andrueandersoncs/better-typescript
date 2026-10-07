---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Decode external data at the boundary

Decode and validate HTTP input, external API data, persisted data, queued messages, and other untrusted input at the boundary before domain code uses it. Never treat static TypeScript types as runtime validation.
