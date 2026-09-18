---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Separate unit, integration, and end-to-end tests

Colocate unit tests with the code they exercise. Keep database and external-service integration tests with the code that owns those integrations, and keep end-to-end tests with their deployed user journeys. Cover important contracts and failure cases at the appropriate layer. Give every migration an explicit owner and an exercised integration path.
