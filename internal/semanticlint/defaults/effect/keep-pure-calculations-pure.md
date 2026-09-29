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

Converting already decoded values into a result by mapping, formatting, or constructing values is a pure transformation. Keep that conversion as an ordinary function; do not wrap it in Effect.fn or Effect.try merely because the caller performs I/O or the output uses a constructor. Use Effect.try only for a call that can actually throw.
