---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make dependencies and side effects visible

Avoid surprising global state, hidden input/output, and unexpected mutation. A function named `calculate_total()` should not silently save a file or send an email.
