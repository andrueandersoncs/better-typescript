# no-reflect-apply

## What it does

Reports calls to the global `Reflect.apply`.

## When to use it

Use it to keep function calls typed and dynamic dispatch behind a named interface.

## Conformant

```ts
operation.apply(owner, args)
```

## Non-conformant

```ts
Reflect.apply(operation, owner, args)
```
