---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep operational policies with their operations

Report code that separates an integration or workflow from the timeout, concurrency, retry-selection, or logging policy controlling its execution. For example, report `fetchOrders` whose `Effect.retry`, `Effect.timeout`, concurrency limit, or logging choice is configured in an unrelated caller rather than beside the owning operation. Do not report a policy kept beside the integration or workflow that owns the operation.
