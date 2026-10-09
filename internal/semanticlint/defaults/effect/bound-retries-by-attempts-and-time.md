---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Bound retries by attempts and total time

Report only a retry path shown in this file that has no finite maximum-attempt limit or no finite end-to-end elapsed-time limit. This includes `Effect.retry(...)` with an unbounded schedule, or a retry wrapper whose total limit does not cover inherited SDK retries, per-attempt timeouts, backoff, and server-provided delays. Do not report a retry path that shows finite limits for both attempts and total elapsed time covering those sources.
