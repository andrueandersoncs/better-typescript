# require-command-name-consistency

## What it does

For identifier-named arrow/function-expression variables, function declarations, and methods starting with publish, save, send, or write, requires the explicit return-type text to contain void or effect; an inferred void result has unknown shape and can still report. For the tested case, it reports: `saveUser claims the command save, but its result and body do not provide command evidence.` It also reports many `void` callables named like accessors or results. Names ending in `handler` or `callback` are allowed.

## When to use it

Use it when command names must identify side-effecting callables.

## Conformant

```ts
const saveRecord = (): void => undefined
```

## Non-conformant

```ts
const saveUser = (): string => "user"
```
