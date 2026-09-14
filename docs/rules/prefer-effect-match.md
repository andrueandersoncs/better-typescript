# prefer-effect-match

## What it does

Reports chained literal ternaries that repeatedly compare the same source expression.

## When to use it

Use Effect Match for readable, exhaustiveness-friendly branching.

## Conformant

```ts
const label = Match.value(kind).pipe(Match.when("a", () => "A"), Match.orElse(() => "Other"))
```

## Non-conformant

```ts
const label = kind === "a" ? "A" : kind === "b" ? "B" : "Other"
```
