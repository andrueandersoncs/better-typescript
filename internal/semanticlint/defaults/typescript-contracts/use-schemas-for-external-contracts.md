---
globs:
  - "**/*.{ts,tsx}"
---
# Use schemas for external contracts

Make schemas the source of truth for external request, response, and event contracts, and derive their TypeScript types from those schemas. Decode HTTP input, external API data, persisted data, and queued messages at the boundary before domain code uses them. Never treat static TypeScript types as runtime validation.
