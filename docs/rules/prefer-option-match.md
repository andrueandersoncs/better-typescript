# prefer-option-match

## What it does

Reports a ternary that uses `Option.isSome` or `Option.isNone` and then reads `.value` from the checked identifier. Use `Option.match` instead.

## When to use it

Use it when both Option branches should be explicit. Other guards and non-identifier inputs are not reported.

## Conformant

```ts
import { Option } from "effect"
declare const value: Option.Option<number>
export const result = Option.match(value, {
  onNone: () => 0,
  onSome: (n) => n,
})
```

## Non-conformant

```ts
import { Option } from "effect"
declare const value: Option.Option<number>
export const result = Option.isSome(value) ? value.value : 0
```
