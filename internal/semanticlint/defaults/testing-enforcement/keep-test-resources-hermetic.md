---
globs:
  - "package.json"
  - "**/*config*.{ts,js,mjs,cjs,json}"
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep test resources hermetic

Tests that use databases, files, ports, queues, accounts, or external services must allocate isolated resources.

Shared read-only resources are allowed when tests cannot mutate them or depend on execution order.
