---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Match operational policies to each operation

Do not apply one timeout, concurrency, retry, or logging policy indiscriminately to operations with different contracts.

Report only when this file applies one policy to operations whose contracts need different policies.
