---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Reuse expensive test setup at the narrowest safe scope

Report tests in one file that restart equivalent expensive setup for every test when isolated suite- or worker-scoped reuse preserves behavior. Examples include every `it` creating the same server, runtime, `Layer`, database fixture, or oversized data fixture.

Do not report cheap setup, a fresh resource needed for isolation, or setup that is not equivalent. Report only repeated expensive setup with no behavioral need.
