---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Bound materialized data

Whole-body reads, collection-to-array conversions, deep clones, JSON serialization, and stream collection must have an enforced byte bound when their input can grow beyond the operation's memory or request budget. Use streaming or chunking when the complete value is not required at once.

Do not report small fixed configuration or protocol values. Report only when the changed path fully materializes variable-size data without a demonstrated bound.
