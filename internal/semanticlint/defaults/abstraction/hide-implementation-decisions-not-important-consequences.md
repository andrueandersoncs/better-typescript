---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Hide implementation decisions, not important consequences

Encapsulate details such as storage layout or transport mechanics, but make meaningful behavior apparent. Network requests, expensive work, destructive actions, partial results, and consistency limitations should not be disguised as harmless local operations.
