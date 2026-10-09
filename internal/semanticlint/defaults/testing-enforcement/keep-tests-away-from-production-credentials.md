---
globs:
  - "package.json"
  - "**/*config*.{ts,js,mjs,cjs,json}"
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep tests away from production credentials

Report a test that can reach production or use inherited developer credentials unless it explicitly declares and contains that external dependency. Examples include a test client silently reading `AWS_PROFILE` or default production environment credentials.

Do not report a test whose production access or inherited credential dependency is explicitly declared and contained as its external dependency.
