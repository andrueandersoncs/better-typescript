# prefer-composed-callbacks

## What it does

Reports an inline, one-parameter, expression-bodied arrow callback when its parameter is referenced within an argument to a call in the callback expression. A direct forward such as `value => normalize(value)` or a multi-argument call that passes the parameter as an identifier argument is allowed. This allowed limit is covered by the rule fixture.

## When to use it

Use this rule when inline callbacks hide a composition. Use `flow` or `pipe` when they express the transformation. Otherwise, name the adapter nearby and pass it by reference.

## Conformant

This callback forwards its parameter directly to one function.

```ts
declare const normalize: (value: string) => string;

export const clean = ["a"].map(value => normalize(value));
```

A capturing call may still pass the parameter by identifier.

```ts
declare const update: (previous: number, extra: number) => number;
declare const extra: number;

export const commit = [1].map(previous => update(previous, extra));
```

## Non-conformant

The callback moves `value` through `String` and then `normalize`.

```ts
declare const normalize: (value: string) => string;
const values = [1];

export const bad = values.map(value => normalize(String(value)));
```
