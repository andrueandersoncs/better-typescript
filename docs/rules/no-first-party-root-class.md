# no-first-party-root-class

## What it does

Reports first-party class declarations and class expressions that do not extend another class. An `implements` clause does not count as inheritance.

An inherited class is allowed when it has no `private` or `#` methods.

## When to use it

Use it to keep first-party modules function- and object-based while preserving classes required by inheritance.

## Conformant

```ts
export class IntegratedRuntime extends Error {}

const sqlClient = (filename: string) => filename

export const SqliteBunRuntime = {
  sqlClient,
}

export const DerivedExpression = class extends Error {}
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
  private run() {}
}
```
