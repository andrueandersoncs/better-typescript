---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Give runtimes, resources, and background tasks an owner

Every runtime, long-lived dependency, acquired resource, and background task must have an explicit owner whose lifetime encloses it. Compose application-lifetime dependencies at startup, reuse shared Layer instances within one construction context, release scoped resources, and observe background failures.

Report only when changed code reacquires application-lifetime services per operation, lets an acquired resource escape cleanup, or detaches work without an owner responsible for interruption and shutdown.
