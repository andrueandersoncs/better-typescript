---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Centralize configuration loading and localize ownership

Load environment values at one configuration boundary. Each capability must declare its own settings, and the application must validate and provide them before starting work. Business logic must not read `process.env` or `Bun.env`.

Keep browser and server configuration separate, and represent secret settings with redacted values.
