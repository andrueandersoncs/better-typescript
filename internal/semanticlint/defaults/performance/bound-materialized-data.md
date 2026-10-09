---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Bound materialized data

Report a whole-body read, collection-to-array conversion, deep clone, JSON serialization, or stream collection that fully materializes data whose size can grow beyond the operation's memory or request budget without an enforced byte bound. Examples: `await response.arrayBuffer()`, `Array.from(records)`, `structuredClone(payload)`, `JSON.stringify(body)`, or `Stream.runCollect(stream)` on variable-size input. Do not report small fixed configuration or protocol values, bounded input, or code that streams or chunks when the complete value is not required at once.
