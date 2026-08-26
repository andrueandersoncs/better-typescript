# no-mutation

## What it does

Reports assignment, increment, decrement, and `delete` operations that mutate first-party data. Only ECMAScript and decorator declarations in `lib.es*`, `lib.decorators*`, and `lib.d.ts` count as controlled built-in data. Other libraries, such as `lib.dom.d.ts`, are treated as uncontrolled external declarations. Targets owned only by third-party declarations are also allowed.

## When to use it

Use it to derive new local values instead of changing existing ones. Move shared, long-lived state into the Effect runtime.

## Conformant

```ts
interface Counter { count: number }
const counter: Counter = { count: 0 }
const updated: Counter = { ...counter, count: 1 }
```

## Non-conformant

```ts
interface Counter { count: number }
const counter: Counter = { count: 0 }
counter.count = 1
```
