---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Retry writes only when safe to repeat

A retried state-changing operation must be idempotent or otherwise safe to repeat.

Report only when this file repeats a write without demonstrated safety.
