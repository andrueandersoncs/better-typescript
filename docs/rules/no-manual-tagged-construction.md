# no-manual-tagged-construction

## What it does

Reports object literals with a literal `_tag`. Object patterns passed directly to `Match.when` and `Match.not` are allowed.

## When to use it

Use an existing Schema, tagged class or error, or `Data.taggedEnum` constructor.

## Conformant

```ts
const ready = Ready.make({ value })
```

## Non-conformant

```ts
const ready = { _tag: "Ready", value }
```
