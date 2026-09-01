# related-kind-files

## What it does

Reports named top-level entities outside the canonical file for their kind:

- `schemas.ts`
- `errors.ts`
- `services.ts`
- `layers.ts`
- `effects.ts`
- `algorithms.ts`
- `types.ts`
- `constants.ts`
- `config.ts`

It recognizes real Effect Schema, Context service, Layer, Config, and Effect types through checker symbols. A callable is an effect when all call signatures return Effect. Other callables are algorithms. Schema-derived types stay in `schemas.ts`. Mutable `let` and `var` bindings are not classified as constants.

For non-type entity kinds, the rule also compares first-party types in public signatures. Parameters, returns, generic constraints, public instance members, constructors, and public static members establish the relationship. Private and protected members are ignored. Effect success and error types are primary anchors. Effect requirements are supporting evidence and become anchors only when there are no primary anchors. A set with several types is one composite relationship.

It reports related same-kind non-type entities split across files. It also reports distinct relationship sets mixed in one canonical kind file. Standalone entities without another first-party type in their public signature have no cross-file relationship evidence.

Plain classes, interfaces, type aliases, and enums may depend on types from other domain modules. These entities must stay in `types.ts`, but shared type dependencies do not require one module directory.

The rule has no options or fixer. It does not infer module directory names.

## When to use it

Use it to read module code in batches by kind while keeping unrelated domains separate.

## Conformant

```ts
// users/schemas.ts
export const UserSchema = Schema.Struct({ id: Schema.String })
export type User = typeof UserSchema.Type

// users/effects.ts
export const findUser = (user: User): Effect.Effect<User, UserError, UserRepository> =>
  UserRepository.find(user.id)
```

Types keep their domain owner when they depend on another module's types:

```ts
// table-builder/types.ts
export interface TableDefinition { readonly name: string }
export class Table { constructor(readonly definition: TableDefinition) {} }

// query/types.ts
import type { TableDefinition } from "../table-builder/types.js"
export class QueryDefinition { constructor(readonly table: TableDefinition) {} }
```

A heterogeneous signature may use its own module:

```ts
// transfers/effects.ts
export const transfer = (
  source: Account,
  destination: Account,
  amount: Money
): Effect.Effect<Receipt, TransferError> => // ...
```

## Non-conformant

```ts
// users/user.ts
export const findUser = (user: User): Effect.Effect<User> => // ...
```

```ts
// first/effects.ts
export declare const findUser: (user: User) => Effect.Effect<User>

// second/effects.ts
export declare const removeUser: (user: User) => Effect.Effect<User>
```

```ts
// mixed/effects.ts
export declare const loadUser: (user: User) => Effect.Effect<User>
export declare const loadOrder: (order: Order) => Effect.Effect<Order>
```
