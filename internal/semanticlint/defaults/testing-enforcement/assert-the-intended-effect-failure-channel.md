---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Assert the intended Effect failure channel

When behavior distinguishes expected failures, defects, or interruption, assert the intended channel, tagged variant, and relevant payload through `Exit`, `Cause`, or an equivalent typed helper. Do not replace a specific domain failure assertion with a check that merely observes some thrown value.

Match the assertion to the contract; do not require channel detail that the public behavior intentionally hides.