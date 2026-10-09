---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Execute properties through the test runner

Report a property test that constructs, samples, or checks a property without propagating its pass-or-fail result to the test runner. This includes `void fc.assertAsync(...)`, an unawaited asynchronous check, or `const result = fc.check(...)` whose failure details are ignored.

Do not report a property execution that is returned or awaited, or a result whose failure details are inspected and cause the test to fail explicitly.
