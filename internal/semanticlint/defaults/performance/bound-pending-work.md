---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Bound pending work

Report a producer-consumer path whose pending items, retained bytes, suspended producers, or waiting tasks can grow with input or concurrent callers without backpressure, admission control, rejection, or an explicit dropping policy. Examples include unbounded `pending.push(job)`, a queue where `queue.offer(job)` can outpace `queue.take`, or waiting tasks accumulated behind workers. A limit on active workers alone does not bound the backlog. Do not report a demonstrably small fixed workload or a path whose upstream admission control already bounds retained pending work.
