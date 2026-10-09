---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep test utilities simpler than what they support

Report a test utility whose setup, branching, or internal behavior is more complicated than the behavior it supports. Examples: a fixture builder that reimplements order pricing to test one price display, or a helper with mode flags and retries for a single success-path assertion. Do not report ordinary fixtures, builders, or async waiting that stay no more complex than the behavior they support.
