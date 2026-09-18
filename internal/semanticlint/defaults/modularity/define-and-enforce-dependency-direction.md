---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Define and enforce dependency direction

Decide which parts may depend on which others. For example, business rules should not import UI code or require knowledge of a particular database implementation. Document allowed relationships so that “convenient” imports do not gradually erase the architecture.
