# observable-worker-failure

## What it does

Reports `Effect.ignore` and `Effect.ignoreCause` calls when the call is outside any function or the nearest enclosing function subtree contains no recognized logging call. This keeps discarded Effect failures visible.

The rule recognizes the real Effect exports. Calls to unrelated functions with the same names are allowed. A function is also allowed when it calls `log`, `info`, `warn`, `error`, `debug`, or `trace`, or uses those methods on an object. Object method `fatal` is also recognized.

## When to use it

Use this rule in Effect workers that intentionally skip failed items. Log the expected failure in the worker, or express the skip policy at the owning boundary instead of silently ignoring it.

## Conformant

Logging in the same function makes the ignored failure observable. This allowed case is covered by the rule fixture.

```ts
import { Effect } from "effect";

export const clean = () => {
  console.error("failure");
  return Effect.ignore(Effect.fail("bad"));
};
```

## Non-conformant

This call discards the failure without logging it from an enclosing function.

```ts
import { Effect } from "effect";

export const bad = Effect.ignore(Effect.fail("bad"));
```
