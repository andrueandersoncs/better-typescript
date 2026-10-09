---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# State the law property tests enforce

Report a property test that does not express a justified law over a defined domain, or that invents a law from an implementation detail merely to use generated testing. A law can state preservation, ordering, idempotence, conservation, or round-trip equivalence, such as `decode(encode(order))` over defined orders.

Do not report a property that enforces such a justified law over its defined domain.
