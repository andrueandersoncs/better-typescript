---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make important consequences apparent

Make database writes, network requests, file operations, expensive work, destructive actions, partial results, and consistency limitations apparent to callers and readers. Do not disguise them as harmless local operations or hidden side effects: a calculation should not silently save a file or send an email.
