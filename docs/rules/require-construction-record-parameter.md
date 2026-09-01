# require-construction-record-parameter

## What it does

Reports identifier-named `make`, `create`, `build`, and `construct` functions, methods, arrows, and function expressions with two or more value parameters. A `this` parameter is not counted. Unary construction and names such as `createBook` are allowed.

## When to use it

Use this rule so construction takes one named record. Callers pass fields by name instead of a positional list.

## Conformant

```ts
interface TableDefinition {
  name: string;
  schema: string;
}

export const make = (fields: TableDefinition): string => fields.name
```

A one-parameter `make` is also outside this rule's checked limit.

```ts
export const make = (schema: string): string => schema
```

## Non-conformant

`make` takes two positional parameters instead of one named record.

```ts
export const Table = {
  make(name: string, schema: string): string { return name },
}
```
