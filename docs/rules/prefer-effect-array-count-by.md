# prefer-effect-array-count-by

## What it does

Reports `.length` on the result of Effect's `Array.filter`. The report says: `Avoid filtering an array only to count matching elements.` It recommends `Array.countBy(values, predicate)`.

It checks direct Effect `Array.filter` calls. Its `pipe` arm recognizes only a bare `pipe` identifier whose symbol resolves directly, without alias resolution, to `/node_modules/effect/`. The last argument must be a one-argument Effect `Array.filter(...)` call. A normal named `pipe` import is an alias, so this arm does not match it. It does not target unrelated `filter` functions.

## When to use it

Use it when only the number of matching array elements is needed.

## Conformant

```ts
import { Array } from "effect"

const count = Array.countBy([1, 2], (value) => value > 1)
```

## Non-conformant

```ts
import { Array } from "effect"

const count = Array.filter([1, 2], (value) => value > 1).length
```
