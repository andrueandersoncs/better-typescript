---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Control test nondeterminism

Control clocks, randomness, locale, timezone, generated identifiers, and scheduling when they affect test expectations. Preserve the seed or other replay data needed to reproduce a generated failure.

Do not report randomness used only to allocate isolated resource names or inputs that cannot affect the asserted behavior.