# no-void-functions

## What it does

Reports function declarations, function expressions, arrow functions, and methods whose resolved return type is `void`. It allows the tested non-void return case. It also allows a contextually typed callback when the consumer permits `void`, `any`, or `unknown`, and allows a contextually typed object-literal method.

## When to use it

Use it to describe side effects with an Effect instead of running them in a `void` function. Keep consumer-required `void` callbacks by giving them the consumer's callback type.

## Conformant

```ts
export function value(): number {
  return 1
}

const callback: (value: string) => void = (value) => {
  console.log(value)
}
```

## Non-conformant

```ts
export function log(): void {
  console.log("done")
}
```
