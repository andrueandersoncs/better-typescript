---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Compose timeouts and retries deliberately

Apply this policy where one operation is wrapped by both a timeout (`Effect.timeout`, `timeoutFail`, `timeoutTo`, ...) and a retry (`Effect.retry`, `retryOrElse`, ...), and nearby text states the intended budget: a doc comment, a comment, or a name such as a per-attempt or total budget constant.

First decide which wrapper is outer. In nested calls the outer function is outer. In `pipe`, each step wraps everything before it, so the step listed later is outer:

- `op.pipe(Effect.timeout(d), Effect.retry(s))` and `Effect.retry(Effect.timeout(op, d), s)` give every attempt its own timeout `d`;
- `op.pipe(Effect.retry(s), Effect.timeout(d))` and `Effect.timeout(Effect.retry(op, s), d)` give all attempts together one total budget `d`.

Report a composition whose order contradicts its stated budget:

- the text promises one overall limit for the call and all of its retries, but the timeout is inside the retry, so the real worst case is `d` per attempt plus delays;
- the text promises that each attempt is limited separately so a hung attempt gives way to the next one, but the timeout is outside the retry, so one slow attempt can consume the whole budget and no retry runs.

Do not report either ordering merely because it differs from the other, a composition whose order matches its stated budget, or code with only a timeout or only a retry.
