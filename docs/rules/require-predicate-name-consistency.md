# require-predicate-name-consistency

## What it does

For identifier-named arrow/function-expression variables, function declarations, and methods, requires predicate-style names to return boolean or a type predicate. It uses an explicit return annotation when present and otherwise recognizes checker-inferred boolean types without treating generic types that merely contain `boolean` as predicates. For the tested case, it reports: `isUser claims a predicate, but its result shape is object.` It also reports boolean results named with incompatible operations such as `get`, `parse`, or `save`.

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
