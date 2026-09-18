---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Use stable user-facing browser locators

Locate browser elements by role, accessible name, label, visible text, or an explicit test contract. Do not make a test depend on incidental DOM nesting, generated classes, or positional selection when a stable user-facing locator is available.

Structural selectors are allowed when document structure is itself the contract.