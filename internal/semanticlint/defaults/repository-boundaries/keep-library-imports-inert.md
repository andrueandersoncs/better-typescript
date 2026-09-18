---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep library imports inert

Importing a reusable module must not start a server, connect to a database, run migrations, launch background work, or validate the whole application's environment. Keep declarations and harmless pure initialization at module scope; perform infrastructure construction and execution from an explicit application or framework entry point.
