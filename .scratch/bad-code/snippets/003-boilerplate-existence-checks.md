# Boilerplate Existence Checks

- ID: 003
- Added: 2026-09-02
- Source: paste
- Path: none

## Why it is bad

unspecified

## Code

```ts
export const runtimeOptionsHasRepositoryDirectory = (
  options: RuntimeOptions,
) => options.repositoryDirectory.length > 0;

export const runtimeOptionsHasDatabasePath = (options: RuntimeOptions) =>
  options.databasePath.length > 0;

export const runtimeOptionsHasSessionDirectory = (options: RuntimeOptions) =>
  options.sessionDirectory.length > 0;

export const runtimeOptionsHasWebDirectory = (options: RuntimeOptions) =>
  options.webDirectory.length > 0;

export const runtimeOptionsHasServerLogPath = (options: RuntimeOptions) =>
  options.serverLogPath.length > 0;

export const runtimeOptionsHasLogMaxBytes = (options: RuntimeOptions) =>
  Option.isSome(options.logMaxBytes);

export const runtimeOptionsHasLogRetainedFiles = (options: RuntimeOptions) =>
  Option.isSome(options.logRetainedFiles);
```

## Analysis

### Shape: Boilerplate existence checks

- Observable shape: Multiple utility functions repeat property-presence checks.
- Existing rules: none
- Pattern: [boilerplate-existence-checks](../patterns/boilerplate-existence-checks.md)
- Emergence: attached
- Reason: The existing pattern owns this repeated, AST-detectable family and its shared-helper replacement.
