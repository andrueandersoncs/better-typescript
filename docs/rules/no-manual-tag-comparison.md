# no-manual-tag-comparison

## What it does

Reports direct `_tag` comparisons and `_tag` switches outside broad Effect catch handlers.

## When to use it

Use Effect Match or `Predicate.isTagged` for tagged-value branching.

## Conformant

```ts
Predicate.isTagged("Ready")(value)
```

## Non-conformant

```ts
value._tag === "Ready"
```
