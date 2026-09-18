---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Name functions for their values

Function names must identify either the value they consume, the value they
produce, or the effect they produce. Names such as `rulesFromFiles`, `findingFromAnswer`, `generateHumanReport`, and
`processExitCode` satisfy this rule. A name is vague only when it consists solely
of a generic operation such as `run`, `handle`, `process`, or `execute`.

The `ValueFromInput` form names both sides explicitly. A noun phrase such as
`errorMessage`, `rulePaths`, `humanReport`, `lintOutcome`, or
`systemOneResponse` names the value produced and is compliant; a `get`, `build`,
or `create` prefix is not required.
