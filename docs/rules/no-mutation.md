# no-mutation

## What it does

Reports assignment, increment, decrement, `delete`, and `for...in`/`for...of` rebinding operations that mutate first-party data. It also reports the target of `Object.assign`, `Object.defineProperty`, `Object.defineProperties`, `Object.setPrototypeOf`, `Reflect.set`, `Reflect.defineProperty`, `Reflect.deleteProperty`, and `Reflect.setPrototypeOf`, and the receiver of `Date` setters. A fresh object literal, array literal, or `new` target, as in `Object.assign({}, value)`, is allowed. Only ECMAScript and decorator declarations in `lib.es*`, `lib.decorators*`, and `lib.d.ts` count as controlled built-in data. Other libraries, such as `lib.dom.d.ts`, are treated as uncontrolled external declarations. Targets owned only by third-party declarations are also allowed, unless they are reached through a parameter.

## When to use it

Use it as the application-code default: derive new local values instead of changing existing ones. An owned library kernel may use a local mutable builder under explicit project policy, but this syntactic rule does not infer ownership or auto-exempt lexical mutation.

For shared state, use `Ref.update` or `Ref.modify` for pure atomic transitions. Use `SynchronizedRef.updateEffect` or `SynchronizedRef.modifyEffect` when the transition is effectful, and `Effect.tx` with `TxRef` for an atomic multi-cell transition. Contention alone does not require `SynchronizedRef`. A local cell does not automatically require a `Layer`; introduce one only for a real resource or lifetime boundary.

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
Object.assign(counter, { count: 2 })

const rename = (element: HTMLElement) => {
  element.id = "next"
}
```
