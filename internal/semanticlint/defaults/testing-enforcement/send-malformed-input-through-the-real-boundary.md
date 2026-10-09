---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e,fixtures}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Send malformed input through the real boundary

Report a test that deliberately creates malformed input and passes it off as a valid domain value instead of sending it through the real untrusted-input boundary. For example, `const order = malformed as Order; process(order)` bypasses the decoder, request handler, or message consumer.

Do not report valid domain input, or malformed input supplied through the actual untrusted-input boundary.
