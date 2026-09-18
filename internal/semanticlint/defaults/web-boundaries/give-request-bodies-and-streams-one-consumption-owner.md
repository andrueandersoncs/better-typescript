---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Give request bodies and streams one consumption owner

Assign one owner to parse, buffer, stream, cancel, and close each body. Middleware must not consume a body that downstream code expects to read; pass the decoded value or an intentionally cloned body instead. Treat a streaming response as active work until its stream finishes or is canceled.
