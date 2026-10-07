---
globs:
  - "package.json"
  - "**/*config*.{ts,js,mjs,cjs,json}"
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep tests away from production credentials

Production access and inherited developer credentials must be impossible in tests unless a test explicitly declares and contains that external dependency.
