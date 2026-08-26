# require-lookup-totality-name-consistency

## What it does

Reports names starting with `find`, `lookup`, `maybe`, or `optional` when the annotated return is one total value. For the tested case, it reports: `findUser claims optional lookup via find, but returns total data.` It also reports `require`, `unsafe`, `getOrThrow`, and `getOrElse` names when the return is optional.

## When to use it

Use it when lookup names must show whether missing data is possible.

## Conformant

```ts
interface User { name: string }
const findOptionalUser = (): User | undefined => undefined
```

## Non-conformant

```ts
interface User { name: string }
const findUser = (): User => ({ name: "bad" })
```
