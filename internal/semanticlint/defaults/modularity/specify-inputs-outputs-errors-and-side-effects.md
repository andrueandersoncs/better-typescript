---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Specify inputs, outputs, errors, and side effects

Report a public interface that does not specify its inputs, outputs, possible errors, and side effects. For example, report an exported `sendOrder(order)` with no stated network effect or failure, or `parseOrder` with no stated result. Do not report a non-public interface.
