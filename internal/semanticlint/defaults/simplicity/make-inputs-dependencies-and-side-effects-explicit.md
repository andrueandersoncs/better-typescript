---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make inputs, dependencies, and side effects explicit

Make inputs and dependencies visible; avoid surprising global state, hidden input/output, or unexpected mutation of inputs. Make database writes, network calls, and other external effects apparent to readers: a calculation should not silently save a file or send an email.
