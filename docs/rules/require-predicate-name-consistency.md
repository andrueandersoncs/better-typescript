# require-predicate-name-consistency

## What it does

For identifier-named arrow/function-expression variables, function declarations, and methods, requires predicate-style names to have explicit return-type text containing boolean or a type-predicate form; an inferred boolean result has unknown shape and can still report. For the tested case, it reports: `isUser claims a predicate, but its result shape is object.` It also reports boolean results named with incompatible operations such as `get`, `parse`, or `save`.

## When to use it

Use it when a callable name must reveal that its result is boolean.

## Conformant

```ts
const isReady = (): boolean => true
```

## Non-conformant

```ts
interface User { name: string }
const isUser = (): User => ({ name: "bad" })
```
