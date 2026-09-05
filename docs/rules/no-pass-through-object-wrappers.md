# no-pass-through-object-wrappers

## What it does

Reports arrow functions, function expressions, and function declarations with at least two parameters whose expression body, or first block statement, returns a call or constructor with a nonempty object literal and forwards every simple identifier parameter exactly once in declaration order using only identifier arguments or object-property values. Unary constructor adapters are allowed because they can carry domain meaning and serve as named callback values.

## When to use it

Use this rule when callers should invoke a factory directly. Keep a wrapper when it adds policy, validation, defaults, or behavior.

## Conformant

```ts
interface Fields { filePath: string; code: string }
declare const Factory: { make: (fields: Fields) => Fields }

const makeFields = (filePath: string, code: string) =>
  Factory.make({ filePath: filePath.trim(), code })
```

## Non-conformant

```ts
interface Fields { filePath: string; code: string }
declare const Factory: { make: (fields: Fields) => Fields }

const makeFields = (filePath: string, code: string) =>
  Factory.make({ filePath, code })
```
