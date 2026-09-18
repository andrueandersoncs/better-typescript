---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Execute Effects created by tests

Every Effect that contains the behavior or assertions under test must reach a recognized Effect-aware runner or an explicitly executed and awaited runtime boundary. Constructing, storing, or returning an Effect to an unaware runner does not execute it.

Respect the installed Effect integration and runner version. Do not assume Effect-specific helpers are native to another runner.