---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# State the law property tests enforce

Apply this policy only to property tests: generated inputs fed to a property runner such as `fc.assert(fc.property(...))`. A file with only example-based tests cannot violate it.

A property must enforce a law that holds independently of how the code is written: preservation, ordering, idempotence, conservation, invariants, or round-trip equivalence, such as `expect(decode(encode(value))).toEqual(value)`. Report any of these shapes:

- an expected value computed by repeating the implementation's own formula, such as `expect(f(n)).toBe(n % k)` when `f` is `(n) => n % k`, so the property can only confirm the code equals itself;
- a test name or description that restates the implementation's mechanism (which operator, field, or step it uses) rather than a behavior callers rely on;
- a property whose assertion holds for any implementation, or that never relates the output to the generated input.

Do not report a property that enforces a justified law over its defined domain, or one that compares against an independent reference model that is simpler than, and not a copy of, the code under test.
