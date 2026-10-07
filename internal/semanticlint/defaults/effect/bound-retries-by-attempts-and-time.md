---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Bound retries by attempts and total time

Every retrying operation must have a finite attempt limit and a finite total elapsed-time budget that includes inherited SDK retries, per-attempt timeouts, backoff, and server-provided delays.

Report only when this file shows a retry path that can exceed either budget.
