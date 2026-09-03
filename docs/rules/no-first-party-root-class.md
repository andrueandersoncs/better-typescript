# no-first-party-root-class

## What it does

Reports first-party class declarations and class expressions that do not extend another class. An `implements` clause does not count as inheritance.

An inherited class is allowed when every method is either `static` or explicitly marked `override`. Private and `#` methods are always reported. TypeScript verifies that an `override` method exists on the base class.

## When to use it

Use it to keep first-party data immutable: put new behavior in static functions, and keep instance behavior only when inheritance requires an override. Supported bases include Effect Schema models, Effect services, errors, and third-party integrations.

## Conformant

```ts
import { Schema } from "effect"

export class IntegratedRuntime extends Error {}

const sqlClient = (filename: string) => filename

export const SqliteBunRuntime = {
  sqlClient,
}

export const DerivedExpression = class extends Error {}

export class AgentPolicy extends Schema.Class<AgentPolicy>("AgentPolicy")({
  maxTurns: Schema.Number,
}) {
  static resolve(): AgentPolicy {
    return AgentPolicy.make({ maxTurns: 12 })
  }
}

export class DetailedError extends Error {
  override toString(): string {
    return super.toString()
  }
}
```

## Non-conformant

```ts
export class SqliteBunRuntime {
  private constructor() {}

  static sqlClient(filename: string) {
    return filename
  }
}

interface Runtime {}
export class ImplementsOnly implements Runtime {}

export const RootExpression = class {}

export class StatefulIntegration extends Error {
  run() {}
}

export class HiddenIntegration extends Error {
  private run() {}
}
```
