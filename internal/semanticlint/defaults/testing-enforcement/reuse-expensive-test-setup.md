---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Reuse expensive test setup at the narrowest safe scope

Do not restart the same server, runtime, Layer, database fixture, or oversized data fixture for every test when isolated reuse at suite or worker scope preserves behavior. Keep mutable test state isolated and reset it deterministically.

Do not report cheap setup or cases that require a fresh resource to preserve isolation. Report only when tests in this file repeat expensive equivalent setup without a behavioral need.
