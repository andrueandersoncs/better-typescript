---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make correct use straightforward and invalid use difficult

Report an API that permits an invalid state or operation and relies only on documentation or a caller remembering a rule to prevent it. Examples: `createOrder(status: string)` despite a fixed set of statuses, or `send(user, true)` where the boolean selects a dangerous mode. Do not report code that represents the invariant in its types or operations, such as a `Status` union, a constructor that validates input, or separate safe operations.
