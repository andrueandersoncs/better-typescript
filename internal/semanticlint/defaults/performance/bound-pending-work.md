---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Bound pending work

When producers can outpace consumers, bound pending items, retained bytes, suspended producers, and waiting tasks through backpressure, admission control, rejection, or an explicit dropping policy. A limit on active workers alone does not bound the backlog.

Do not report a demonstrably small fixed workload or a path whose upstream admission control already bounds retained pending work. Report only when backlog can grow with input or concurrent callers.
