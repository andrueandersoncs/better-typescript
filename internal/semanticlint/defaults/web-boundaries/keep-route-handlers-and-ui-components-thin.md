---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep route handlers and UI components thin

Handlers should decode input, establish identity, invoke an application operation, and encode the result. Keep business decisions out of routes, UI components, and database hooks.
