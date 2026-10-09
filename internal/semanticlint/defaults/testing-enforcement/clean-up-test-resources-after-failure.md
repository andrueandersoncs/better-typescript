---
globs:
  - "package.json"
  - "**/*config*.{ts,js,mjs,cjs,json}"
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Clean up test resources after failure

Apply this policy only where test code acquires an external resource: it creates or opens a database or connection, writes files or temporary directories, starts a server or listens on a port, creates a queue, or provisions an account in an external service. Code that only builds in-memory values cannot violate this rule.

Every acquired resource must be released on a path that still runs when an assertion or awaited call throws, as in `const db = await openTestDb(); try { ... } finally { await db.dispose() }`. Accepted release paths are `try`/`finally`, `afterEach`/`afterAll` hooks, `onTestFinished`, `using`/`await using`, and scope finalizers such as `Effect.addFinalizer` or `Effect.acquireRelease`. Report any of these shapes:

- a test or helper that acquires a resource and never releases it, such as `const conn = await connect(name)` followed only by queries and `expect(...)` calls;
- a release placed after the assertions in the test body, such as `expect(rows).toHaveLength(1); await conn.end()`, which is skipped when the assertion fails;
- a global setup that starts a server, container, or database without a matching teardown.

Do not report resources the test runner or framework releases automatically, or files written into a directory that a hook or finalizer removes.
