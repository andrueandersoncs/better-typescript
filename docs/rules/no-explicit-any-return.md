# no-explicit-any-return

## What it does

Reports explicit function return types that contain `any`, including nested return types such as `Promise<any>`.

## When to use it

Use it to require precise return types. Use `unknown` for an unknown boundary value, then narrow it before use.

## Conformant

```ts
export function parse(): Promise<unknown> {
  return Promise.resolve({})
}
```

## Non-conformant

```ts
export function parse(): Promise<any> {
  return Promise.resolve({})
}
```
