# Abstract class with many readonly properties

- ID: 006
- Added: 2026-09-02
- Source: paste
- Path: none

## Why it is bad

unspecified

## Code

```ts
export abstract class AgentPoolOptions extends Object {
  abstract readonly size: number;
  abstract readonly command: string;
  abstract readonly dataDirectory: string;
  abstract readonly model: unknown;
  abstract readonly provider: string;
  abstract readonly sessionDirectory: string;
  abstract readonly workingDirectory: string;
  abstract readonly isolationMode: "shared" | "worktree";
  abstract readonly workspaceRootDirectory: string;
  abstract readonly integrationMode: "automatic";
  abstract readonly integrationBranch: unknown;
  abstract readonly verificationCommand: string;
  abstract readonly verificationTimeoutMillis: number;
  abstract readonly completedProcessExitGraceMillis: unknown;
  abstract readonly processGroupTerminationGraceMillis: unknown;
  abstract readonly processPlatform: unknown;
  abstract readonly serverLogPath: string;
  abstract readonly dashboardUrl: unknown;
  abstract readonly otlpUrl: string;
  abstract readonly telemetryQueryUrl: string;
}
```

## Analysis

### Shape: abstract class with many readonly properties

- Observable shape: Abstract class with 5+ abstract readonly properties
- Existing rules: none
- Pattern: [abstract-class-with-readonly-properties](../patterns/abstract-class-with-readonly-properties.md)
- Emergence: attached
- Reason: The existing pattern owns this data-only abstract class shape and its interface replacement.
