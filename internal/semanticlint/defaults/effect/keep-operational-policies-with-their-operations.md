---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep operational policies with their operations

Keep timeout, concurrency, retry selection, and logging policy beside the integration or workflow that owns the operation. Do not hide operational policy in a global retry-everything helper or unrelated configuration.

Report only when changed code separates an operation from the policy that controls its execution or applies one policy indiscriminately to operations with different failure and resource contracts.
