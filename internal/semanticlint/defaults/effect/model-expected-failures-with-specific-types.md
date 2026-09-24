---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Model expected failures with specific types

Apply this policy only to expected failures in an Effect workflow. Do not report deterministic calculations that return domain or check outcomes without an Effect error channel.

Model each expected failure with a specific tagged error type. Keep expected failures in the Effect error channel and defects in the defect channel. Do not use universal error types, swallow failures, or convert expected failures into defects merely to simplify a signature.

Report an expected failure in an Effect workflow when it uses an unspecific error type, is swallowed, or is converted into a defect merely to simplify a signature.

Translate expected failures into HTTP responses or UI states only at the HTTP or UI boundary.
