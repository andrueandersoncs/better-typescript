---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Name tests after condition and outcome

Report a test name that omits either the condition under test or the expected outcome. For example, report `it("works", ...)`, `it("when there are no orders", ...)`, and `it("returns an empty list", ...)`; each leaves out required information. A name such as `it("returns an empty list when there are no orders", ...)` states both. Do not report names of helpers, variables, or production functions.
