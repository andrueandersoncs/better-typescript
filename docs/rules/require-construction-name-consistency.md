# require-construction-name-consistency

## What it does

Reports a callable that constructs its named return concept without construction vocabulary. For the tested case, it reports: `user constructs a value, but does not use construction vocabulary.` It recognizes `make`, `create`, `build`, and `construct`, plus common variant constructors. It also rejects those factory verbs when the body uses `.find` or indexed lookup instead of construction.

## When to use it

Use it when names must distinguish new values from existing values.

## Conformant

```ts
interface User { name: string }
const makeUser = (): User => ({ name: "ok" })
```

## Non-conformant

```ts
interface User { name: string }
const user = (): User => ({ name: "bad" })
```
