---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Place boundaries around decisions that should be able to change independently

For example, changing a payment provider should not require rewriting order validation. Hide the provider-specific behavior behind a payment boundary.
