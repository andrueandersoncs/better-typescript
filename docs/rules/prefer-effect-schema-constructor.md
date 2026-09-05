# prefer-effect-schema-constructor

## What it does

Reports two construction patterns:

- non-empty raw object literals declared inside functions or returned by functions;
- `new` expressions whose constructor is an Effect Schema class.

Raw object reports recommend reusing a matching Effect Schema. Schema classes must use their static `make` method. A string `_tag` makes a raw object report name that tagged variant.

Empty object literals are allowed. Returns with a foreign return contract are allowed. Identifier-shorthand bags of already-bound values and runtime records with callable properties are allowed. Ordinary classes may still use `new`.

## When to use it

Use it when modeled data must be constructed consistently through Effect Schema constructors.

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

Effect Schema classes use `make`.

```ts
import { Schema } from "effect"

class Refresh extends Schema.TaggedClass<Refresh>()("Refresh", {}) {}

const refresh = Refresh.make()
```

## Non-conformant

```ts
function makeUser() {
  return { name: "Ada" }
}
```

```ts
import { Schema } from "effect"

class Refresh extends Schema.TaggedClass<Refresh>()("Refresh", {}) {}

const refresh = new Refresh()
```
