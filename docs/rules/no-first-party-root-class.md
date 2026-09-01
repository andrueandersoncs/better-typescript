# no-first-party-root-class

## What it does

Reports unsupported first-party class declarations.

A class with an `extends` clause is allowed when it has no private methods. A root class is allowed only when it has exactly one private constructor, at least one public static method, and no other members. Methods without a visibility modifier are public unless their name is a private identifier such as `#run`. Constructor parameter properties are not allowed.

Both `private method()` and `#method()` are private methods. The private constructor of a static utility class is the only private member exception.

## When to use it

Use it to keep first-party code structural and function-based while preserving classes required by external inheritance and closed static utility classes.

## Conformant

```ts
export class IntegratedRuntime extends Error {}

export class Helpers {
  private constructor() {}

  static run() {}
}
```

## Non-conformant

```ts
export class SqliteBunRuntime {
  constructor(readonly filename: string) {}
}

export class OpenHelpers {
  static run() {}
}

export class StatefulIntegration extends Error {
  private run() {}
}
```
