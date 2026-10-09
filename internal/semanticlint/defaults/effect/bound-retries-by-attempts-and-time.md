---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Bound retries by attempts and total time

Apply this policy only to retry paths shown in this file, such as `Effect.retry(...)`, `Effect.retryOrElse(...)`, or a hand-written retry loop. A file without a retry cannot violate this rule.

Every retry needs both a finite attempt limit and a finite total elapsed-time limit, as in `Schedule.upTo(Schedule.exponential("100 millis"), { times: 3, duration: "5 seconds" })`. Report any of these shapes:

- an attempt limit with no elapsed-time limit, such as a schedule that is only `Schedule.recurs(n)` or `Schedule.upTo(base, { times: n })`, even when `n` is small or the base schedule has no delay;
- an elapsed-time limit with no attempt limit, such as `Schedule.upTo(base, { duration: "5 seconds" })` or `Schedule.during(...)` without `times`/`recurs`;
- a schedule with neither, such as bare `Schedule.spaced(...)`, `Schedule.exponential(...)`, `Schedule.forever`, or a `while (true)` retry loop;
- a retried effect that performs I/O visible in this file (`fetch`, `Effect.tryPromise` around a client call, a socket read) with no `Effect.timeout` on each attempt before `retry` and none around the whole retry, because the schedule's `duration` cannot stop an attempt that hangs;
- a wrapper whose total limit ignores retries already performed by an inner SDK or client, or server-provided delays such as `Retry-After`.

A retry is compliant when it shows both limits and, for visible I/O, a timeout on each attempt or on the entire retried effect. A retried effect that fails immediately without I/O needs no attempt timeout.
