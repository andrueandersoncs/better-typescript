# no-undefined

## What it does

Reports comparisons with `undefined`. It also reports optional or `undefined` parameters and type properties, function return types containing `undefined`, and functions that directly return `undefined`.

## When to use it

Use this rule when optional values must use Effect's `Option` module. A bare `return;` in a `void` function is allowed.

## Conformant

```ts
export const isZero = (value: number) => value === 0
export function returnNothing(): void {
  return
}
```

## Non-conformant

```ts
declare const value: number | undefined
export const isMissing = value === undefined
```
