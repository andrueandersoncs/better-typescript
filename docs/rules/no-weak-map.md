# no-weak-map

## What it does

Reports references to the built-in or declaration-file `WeakMap` identifier, not only constructor calls. It allows the tested ordinary `Map` case. A `WeakMap` symbol declared in first-party source is also allowed.

## When to use it

Use it to keep mutable state inside Effect. Store immutable state in `Ref`, use `SynchronizedRef` for effectful updates, or use `SubscriptionRef` when consumers need a stream of changes.

## Conformant

```ts
export const cache = new Map<object, string>()
```

## Non-conformant

```ts
export const cache = new WeakMap<object, string>()
```
