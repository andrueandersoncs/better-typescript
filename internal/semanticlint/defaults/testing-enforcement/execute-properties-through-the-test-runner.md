---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Execute properties through the test runner

Apply this policy only to tests that build or run a property with a property-testing library such as fast-check. A property's failure must reach the test runner: a synchronous property must be run with a call that throws on failure, and an asynchronous property's promise must be awaited or returned from the test, as in `it("...", async () => { await fc.assert(fc.asyncProperty(fc.nat(), async (n) => ...)) })`. Report any of these shapes:

- `fc.assert(...)` or `fc.check(...)` on an `fc.asyncProperty(...)` whose returned promise is neither awaited nor returned, including inside a non-`async` test callback such as `it("...", () => { fc.assert(asyncLaw) })`;
- `void fc.assertAsync(...)` or `void fc.assert(asyncLaw)`, or an asynchronous check passed to `.then(...)` without awaiting or returning it;
- `fc.check(law)` called as a bare statement, or `const report = fc.check(law)` whose `failed` flag is never asserted, because `fc.check` reports failure instead of throwing;
- a property built with `fc.property(...)` or `fc.asyncProperty(...)` that is never executed.

Do not report a synchronous `fc.assert(fc.property(...))`, an asynchronous check that is awaited or returned, a check result whose failure details are asserted (such as `expect(report.failed).toBe(false)`), or a runner-integrated helper such as `test.prop(...)` or `it.prop(...)`.
