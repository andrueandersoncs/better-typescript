---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Handle failures at the layer that understands them

Translate errors only when doing so adds useful meaning for callers. Preserve structured failures, underlying causes, and relevant context until a boundary requires another representation. Do not erase failures into strings or success-shaped defaults, and do not add retries without considering whether repeating the operation is safe.
