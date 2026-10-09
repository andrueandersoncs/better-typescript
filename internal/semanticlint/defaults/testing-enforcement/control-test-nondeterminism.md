---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Control test nondeterminism

Report a test whose expectation depends on an uncontrolled clock, random value, locale, timezone, generated identifier, or scheduling order. Examples include asserting `Date.now()`, `Math.random()`, or a timer race without controlling it.

Do not report `crypto.randomUUID()` used only to allocate an isolated database or temporary-file name, or random input that cannot affect the asserted behavior.
