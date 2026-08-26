# no-monomorphic-struct-get

## What it does

Reports a variable with an explicit, non-generic function type when it is initialized by a one-argument call to Effect's `Struct.get`. A directly exported variable statement and an inferred declaration are allowed.

## When to use it

Use it to keep `Struct.get` polymorphic. Put the domain type on the consumer or result instead of the getter declaration.

## Conformant

```ts
import { Struct } from "effect"

interface Item { readonly name: string }
const itemName = Struct.get<Item, "name">("name")
```

## Non-conformant

```ts
import { Struct } from "effect"

interface Item { readonly name: string }
const itemName: (item: Item) => string = Struct.get("name")
```
