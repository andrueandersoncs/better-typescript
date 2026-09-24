---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep pure calculations pure

Write deterministic formatting, calculations, and transformations as ordinary
functions, even when called by effectful application operations. Pure validation
may return failure as data. Use Effect for effectful operations needing
dependencies, failures, resources, concurrency, or observability; do not create
services merely to group pure utilities.
