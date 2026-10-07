---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Separate application dependencies from request state

Give current-user, tenant, and transaction context to the request or operation that owns it; never store mutable user state in global shared services. Apply the same boundary in server-rendered frontend code.
