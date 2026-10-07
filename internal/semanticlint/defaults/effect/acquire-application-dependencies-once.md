---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Acquire application dependencies once

Compose application-lifetime dependencies, such as connection pools and shared services, once at startup and share them. Reuse shared Layer instances within one construction context.

Report only when this file reacquires application-lifetime services or resources per operation.
