---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Separate application dependencies from request state

Share application-wide resources such as connection pools. Give current-user, tenant, and transaction context to the request or operation that owns it; never store mutable user state in global shared services. Apply the same boundary in server-rendered frontend code.
