# prefer-effect-schema-constructor

## What it does

Reports two construction patterns:

- raw object literals with a string `_tag` that are declared inside functions or returned by functions;
- `new` expressions whose constructor is an Effect Schema class.

Tagged raw object reports recommend reusing a matching Effect Schema protocol variant. Schema classes must use their static `make` method for a consistent construction style.

Untagged object literals are allowed because structural fixtures, API option objects, and transient accumulators do not by themselves establish an Effect Schema contract. Returns with a foreign return contract and runtime records with callable properties are also allowed. Ordinary classes may still use `new`.

## When to use it

Use it when modeled data must be constructed consistently through Effect Schema constructors. For `Schema.Class`, both `new` and `make` validate constructor input through construction; this rule prefers `make` for consistency, not because `new` bypasses validation. Neither constructor form decodes encoded or unknown boundary input: use an appropriate schema decoder at that boundary.

## Conformant

```ts
function makeFixture() {
  return { name: "Ada", attempts: 2 }
}

function makeTransient(score: number) {
  const candidate = { score, selected: score > 0 }
  return candidate
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
  return { _tag: "User", name: "Ada" }
}
```

```ts
import { Schema } from "effect"

class Refresh extends Schema.TaggedClass<Refresh>()("Refresh", {}) {}

const refresh = new Refresh()
```
