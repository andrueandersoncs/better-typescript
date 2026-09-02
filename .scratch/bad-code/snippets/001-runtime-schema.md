# RuntimeOptionsSchema Monolith

## Why it is bad

Unspecified

## Code

```typescript
export const RuntimeOptionsSchema = Schema.Struct({
  dataDirectory: Schema.String,
  repositoryDirectory: Schema.String,
  databasePath: Schema.String,
  hostname: Schema.String,
  port: Schema.Number,
  size: Schema.Number,
  command: Schema.String,
  model: Schema.Option(Schema.String),
  provider: Schema.String,
  sessionDirectory: Schema.String,
  workingDirectory: Schema.String,
  isolationMode: Schema.Literals(["shared", "worktree"]),
  workspaceRootDirectory: Schema.String,
  integrationMode: Schema.Literal("automatic"),
  autonomousExecution: Schema.Boolean,
  integrationBranch: Schema.Option(Schema.String),
  verificationCommand: Schema.String,
  verificationTimeoutMillis: Schema.Number,
  webDirectory: Schema.String,
  processRole: Schema.Literals(["all", "server", "coordinator", "dev-supervisor"]),
  runId: Schema.String,
  processInstanceId: Schema.Option(Schema.String),
  logDirectory: Schema.String,
  traceLinkTemplate: Schema.String,
  serverLogPath: Schema.String,
  dashboardUrl: Schema.Option(Schema.String),
  otlpUrl: Schema.String,
  telemetryQueryUrl: Schema.String,
  authPath: Schema.Option(Schema.String),
  logMaxBytes: Schema.Option(Schema.Number),
  logRetainedFiles: Schema.Option(Schema.Number),
});
```

## Analysis

### Shape: Monolithic schema struct

- Observable shape:
  - Schema.Struct with many unrelated configuration fields
- Existing rules: none
- Pattern: [monolithic-runtime-schema](../patterns/monolithic-runtime-schema.md)
- Emergence: new-prospective
- Reason: Detectable via AST; replacement: split into focused subschemas

### Shape: Single-value literals schema

- Observable shape:
  - Schema.Literals with single string value
- Existing rules: none
- Pattern: [hardcoded-literal](../patterns/hardcoded-literal.md)
- Emergence: new-prospective
- Reason: Detectable via AST; replacement: use Schema.Literal

## Patterns

| Pattern | Status |
| --- | --- |
| [monolithic-runtime-schema](../patterns/monolithic-runtime-schema.md) | prospective |
| [hardcoded-literal](../patterns/hardcoded-literal.md) | prospective |
