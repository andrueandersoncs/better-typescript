---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Name functions for their values

Report a function named only for a generic operation, such as `run`, `handle`, `process`, or `execute`, when it identifies neither a consumed value, a produced value, nor a produced effect. Do not report names such as `rulesFromFiles`, `findingFromAnswer`, `generateHumanReport`, `processExitCode`, `errorMessage`, or `rulePaths`; a `get`, `build`, or `create` prefix is not required.
