---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep operational policies with their operations

Keep timeout, concurrency, retry selection, and logging policy beside the integration or workflow that owns the operation. Make wrapper order deliberate: an overall timeout around retries has different semantics from a separate timeout for every attempt. State the resulting budget and whether interrupted or failed work is safe to repeat.

Report only when changed code separates an operation from the policy that controls its execution, applies one policy indiscriminately to operations with different contracts, or composes policies in an order that contradicts the intended budget or repeatability.
