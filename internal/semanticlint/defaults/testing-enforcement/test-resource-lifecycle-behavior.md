---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Test resource lifecycle behavior

Apply this policy only to tests whose subject acquires or holds a resource: a connection or pool checkout, lease, lock, file handle, subscription, server, or scoped or `acquireRelease` resource, including through a `withResource(...)`-style helper. A test that only calls async functions and asserts their results, even with waits or timers, is not applicable.

Such a test must assert the resource's observable state after the work ends, as in:

```ts
await expect(withSession(pool, failingWork)).rejects.toThrow()
expect(pool.openSessions()).toBe(0)
```

Report any of these shapes:

- a test that runs work through a resource-owning helper and asserts only the returned value, never that the resource was released (active count, open handles, current holders, release calls);
- an error-path test that checks the rejection but not that the resource was released after the failure;
- a test that interrupts or cancels a fiber, task, or signal while it holds a resource, then ends or asserts only state captured before the interruption. Interrupting is not itself a test of release on interruption.

Do not report a test that asserts release, ownership, or cleanup after each path it exercises, or a test whose subject acquires no resource.
