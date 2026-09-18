---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Handle failures at the layer that understands them

Translate errors only when doing so adds useful meaning for callers, and preserve the underlying cause and relevant context. Do not silently turn failures into defaults or add retries without considering whether repeating the operation is safe.
