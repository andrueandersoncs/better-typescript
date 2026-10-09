---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep each fact in one authoritative place

Report independently maintained copies of the same business rule, schema, default, configuration value, or invariant, such as `maxOrders = 10` in two modules or validation repeated in every caller. Keep one source and derive secondary values when practical. Do not report a value merely because it appears twice when the instances are separate facts, intentionally independent, or one use is derived.
