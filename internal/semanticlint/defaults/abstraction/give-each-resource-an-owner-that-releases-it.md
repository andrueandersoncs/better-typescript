---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Give each resource an owner that releases it

Every runtime and acquired resource must have an explicit owner whose lifetime encloses it. Make clear who creates, owns, and releases it, and release scoped resources.

Report only when this file lets an acquired resource or runtime escape cleanup or leaves its owner unclear.
