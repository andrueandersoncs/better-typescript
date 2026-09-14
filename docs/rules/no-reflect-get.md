# no-reflect-get

## What it does

Reports calls to the global `Reflect.get`.

## When to use it

Use it to require typed property access or boundary parsing.

## Conformant

```ts
const value = owner.property
```

## Non-conformant

```ts
const value = Reflect.get(owner, key)
```
