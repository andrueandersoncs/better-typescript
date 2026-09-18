---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Give every module one clear purpose

Describe its responsibility in one sentence. “Calculates invoice totals” is a useful boundary; “handles miscellaneous business logic” is not. Keep closely related behavior together, and separate responsibilities that change for different reasons.
