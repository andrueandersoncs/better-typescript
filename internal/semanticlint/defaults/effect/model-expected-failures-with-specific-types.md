---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Model expected failures with specific types

Model each expected failure with a specific tagged error type. Keep expected failures in the Effect error channel and defects in the defect channel. Do not use universal error types, swallow failures, or convert expected failures into defects merely to simplify a signature.

Translate expected failures into HTTP responses or UI states only at the HTTP or UI boundary.
