---
globs:
  - "package.json"
  - "**/*config*.{ts,js,mjs,cjs,json}"
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Clean up test resources after failure

Tests that use databases, files, ports, queues, accounts, or external services must guarantee cleanup after failure.
