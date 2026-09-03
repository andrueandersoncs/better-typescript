# prefer-effect-schema-constructor

## What it does

Reports non-empty raw object literals declared inside functions or returned by functions. The tested report says: `Avoid declaring or returning a raw object literal.` It recommends reusing a matching Effect Schema and constructing the value through `schema.make`.

A string `_tag` makes the report name that tagged variant. Empty object literals are allowed. Returns with a foreign return contract are allowed. Identifier-shorthand bags of already-bound values and runtime records with callable properties are allowed.

## When to use it

Use it for function-local or returned data with independent meaning that should use an Effect Schema constructor.

## Conformant

```ts
function makeEmpty() {
  return {}
}
```

Identifier shorthand assembles existing bindings.

```ts
function makeBundle(table: string, execute: () => void) {
  return { table, execute }
}
```

Runtime records may combine data with callable behavior.

```ts
interface Definition {
  readonly name: string
  readonly write: () => void
}

function makeDefinition(name: string, write: () => void): Definition {
  return { name: name.toUpperCase(), write }
}
```

## Non-conformant

```ts
function makeUser() {
  return { name: "Ada" }
}
```
