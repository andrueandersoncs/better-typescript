---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Avoid copying a growing accumulator

Do not rebuild a growing array or object on every iteration with spread, concatenation, or an equivalent full copy. Use a locally owned builder when intermediate accumulator identities are not observable.

Do not report fixed small inputs or code that must preserve immutable intermediate snapshots. Report only when each iteration copies values accumulated by earlier iterations and the work grows with input size.
