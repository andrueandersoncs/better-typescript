---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Compose timeouts and retries deliberately

Report an operational-policy composition whose wrapper order contradicts its stated intended budget. For example, `Effect.timeout(Effect.retry(operation, schedule), total)` gives all retries one overall budget, while `Effect.retry(Effect.timeout(operation, perAttempt), schedule)` gives every attempt its own timeout; the resulting budget must be stated. Do not report either ordering merely because it differs from the other, or when its stated budget matches its ordering.
