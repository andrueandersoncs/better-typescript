---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Retry only transient failures

Report a retry path shown in this file that retries a failure classified as non-transient, such as `Effect.retry` applied to validation or authorization errors, or a retry predicate that includes a known permanent error. Do not report retries whose selection excludes non-transient failures and retries only failures classified as transient.
