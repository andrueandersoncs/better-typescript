# prefer-composed-callbacks

## What it does

Reports an inline, one-parameter, expression-bodied arrow callback when its parameter is referenced within an argument to a call in the callback expression. A direct one-argument forward such as `value => normalize(value)` is allowed. This allowed limit is covered by the rule fixture.

## When to use it

Use this rule when inline callbacks hide a composition. Use `flow` or `pipe` when they express the transformation. Otherwise, name the adapter nearby and pass it by reference.

## Conformant

This callback forwards its parameter directly to one function.

```ts
declare const normalize: (value: string) => string;

export const clean = ["a"].map(value => normalize(value));
```

## Non-conformant

The callback moves `value` through `String` and then `normalize`.

```ts
declare const normalize: (value: string) => string;
const values = [1];

export const bad = values.map(value => normalize(String(value)));
```
