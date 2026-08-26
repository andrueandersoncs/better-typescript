# require-result-cardinality-name-consistency

## What it does

Checks the result noun in a callable name against its annotated return cardinality. For the tested case, it reports: `getUser names its result as singular user, but returns many.` Arrays, sets, maps, and records need plural result nouns, except neutral nouns such as `data` and `config`.

## When to use it

Use it when callable names must show whether they return one value or a collection.

## Conformant

```ts
interface User { name: string }
const getUsers = (): ReadonlyArray<User> => []
```

## Non-conformant

```ts
interface User { name: string }
const getUser = (): ReadonlyArray<User> => []
```
