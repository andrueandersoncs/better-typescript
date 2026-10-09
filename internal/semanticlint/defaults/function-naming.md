---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Name functions for their values

Apply this policy to every named function, method, and function-valued `const`, exported or local. Judge the name by itself, as a caller reads it; the file name, module namespace, doc comment, parameter types, and body do not rescue a generic name.

Report a function whose whole name is a generic operation that identifies neither a consumed value, a produced value, nor a produced effect:

- a bare generic verb, such as `run`, `execute`, `handle`, `process`, `transform`, `convert`, `compute`, or `apply`, e.g. `export const transform = (items: ReadonlyArray<Item>): number => ...`;
- an exported `run` or `execute` whose doc comment or module explains what it runs;
- a generic verb plus a generic noun, such as `processData`, `handleItem`, or `doWork`.

Do not report names that identify the value or effect, such as `rulesFromFiles`, `findingFromAnswer`, `generateHumanReport`, `processExitCode`, `errorMessage`, `rulePaths`, `countOpenItems`, or `openCount`; a `get`, `build`, or `create` prefix is not required.
