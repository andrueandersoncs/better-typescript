---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Compose timeouts and retries deliberately

Make wrapper order deliberate: an overall timeout around retries has different semantics from a separate timeout for every attempt. State the resulting budget.

Report only when this file composes operational policies in an order that contradicts the intended budget.
