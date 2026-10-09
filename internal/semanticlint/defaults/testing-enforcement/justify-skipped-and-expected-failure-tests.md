---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Justify skipped and expected-failure tests

Apply this policy to test-runner declarations that skip a test, mark it todo, run it only under a condition, or expect it to fail: `it.skip`, `describe.skip`, `test.todo`, `it.skipIf(...)`, `test.runIf(...)`, `test.fails`, and Playwright's in-body `test.skip(...)`, `test.fixme(...)`, `test.fail(...)`.

Each one needs a specific reason written next to it: a comment directly above or beside it, or the runner's description argument, as in `test.skip(platform !== "linux", "relies on a Linux-only syscall")`. Report any of these shapes:

- `it.skip("name", ...)`, `describe.skip(...)`, or `test.fails(...)` with no adjacent comment explaining why;
- a conditional skip that passes only a condition, such as `test.skip(engine !== "x")` or `test.fixme(isCi)`; the condition says when the test is skipped, not why, so the missing description argument still needs a reason;
- a reason too vague to act on, such as `// broken` or `"flaky"`, or one that no longer matches the behavior the test covers.

Do not report focused tests (`it.only`, `describe.only`); they are not skips. Do not report unrelated object properties such as `job.skip` or `task.todo`, or a declaration whose comment or description states a specific reason.
