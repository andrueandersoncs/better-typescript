# no-nested-if-statements

## What it does

Reports an `if` statement inside either branch of another `if` statement, including inside an `else { ... }` block and inside a nested function such as a callback. An `if` that is itself another `if`'s `else` statement (an `else if` chain) is not nested. Independent sequential guard clauses and a single two-way `if`/`else` are not reported.

## When to use it

Use it to keep conditions at one level. Combine related conditions or return early.

## Conformant

```ts
declare const ready: boolean
if (ready) console.log("ready")
else if (!ready) console.log("waiting")
```

## Non-conformant

```ts
declare const a: boolean, b: boolean
if (a) {
  if (b) console.log("nested")
} else {
  [1].forEach(() => {
    if (b) console.log("nested in callback")
  })
}
```
