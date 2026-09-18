---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Test modules through their contracts

A module’s core behavior should generally be testable without starting the whole application. Avoid tests that depend heavily on private implementation details. Also test important integrations: isolated tests alone cannot establish that modules work together.
