---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Bound fan-out over variable inputs

When an operation can start one task per item from a variable-size input, require a limiter that controls when each task starts. Limiting only the wait on promises or Effects that already started does not bound fan-out.

Do not report fixed small inputs, sequential traversal, or work already governed by an enclosing shared limiter. Effect combinators such as `Effect.all` and `Effect.forEach` run sequentially unless their `concurrency` option says otherwise. Report only when this file can start input-dependent work without an enforced concurrency bound.
