---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Bound retries by attempts and total time

Every retrying operation must have a finite attempt limit and a finite total elapsed-time budget that includes inherited SDK retries, per-attempt timeouts, backoff, and server-provided delays. Retry only failures classified as transient.

A retried state-changing operation must be idempotent or otherwise safe to repeat. Report only when the changed path can exceed either budget, retries non-transient failures, or repeats a write without demonstrated safety.
