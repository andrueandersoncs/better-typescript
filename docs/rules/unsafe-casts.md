# unsafe-casts

## What it does

Reports `as any` and `<any>` type assertions. The report says: “Avoid unchecked `as any` assertions in Effect code. Model the missing invariant with Schema decoding, a branded type, or a verified narrowing predicate.” The rule does not require Effect code around the assertion.

## When to use it

Use it to reject unchecked conversions to `any` and require verified narrowing.

## Conformant

```ts
declare const value: unknown
const narrowed = typeof value === "string" ? value : ""
```

## Non-conformant

```ts
declare const unknownValue: unknown
const value = unknownValue as any
```
