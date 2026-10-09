---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Replace unexplained values with meaningful names

Report an unexplained literal when it represents a policy or domain concept that needs a meaningful name. For example, report `Effect.retry({ times: 3 })` when `3` is the retry limit, or `if (attempts >= 3)` when it is the allowed attempt count; use a name such as `MAX_RETRY_ATTEMPTS`. Do not report every unnamed literal: obvious values such as `items.length === 0` need no constant.
