---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Avoid fixed waits in tests

Do not use a fixed wall-clock sleep to guess when observable state is ready. Wait for the actual event, state transition, process readiness signal, or controlled test clock instead.

Do not report a deliberate time-boundary test driven by a fake or controlled clock. Report only when changed test behavior depends on elapsed wall-clock time rather than deterministic synchronization.
