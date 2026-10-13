# require-command-name-consistency

## What it does

Checks identifier-named arrow/function-expression variables, function declarations, and methods using the checker's return type, written or inferred. A name starting with publish, save, send, or write must return no data: `void`, `undefined`, a Promise of those, or an `Effect` whose success type is `void`. For the tested case, it reports: `saveUser claims the command save, but its result and body do not provide command evidence.` A no-data callable named with an accessor verb (find, get, load, lookup, read, select, create, resolve) or a predicate verb (is, has, can, should, does, contains, includes, matches) is also reported. Names ending in `handler` or `callback` are allowed.

## When to use it

Use it when command names must identify side-effecting callables.

## Conformant

```ts
const saveRecord = (): void => undefined
const sendMessage = (message: string) => Effect.sync(() => post(message))
```

## Non-conformant

```ts
const saveUser = (): string => "user"
const saveAccount = (): Effect.Effect<Account> => loadAccount
```
