---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# State the law property tests enforce

A property test must express a justified law over a defined domain, such as preservation, ordering, idempotence, conservation, or round-trip equivalence. Do not invent a law from an implementation detail merely to use generated testing.

The test name or nearby explanation must make the contract and domain understandable.