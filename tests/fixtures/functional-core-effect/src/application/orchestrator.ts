import { Context, Effect } from "effect"

export class Inventory extends Context.Tag("Inventory")<
  Inventory,
  { readonly available: Effect.Effect<number> }
>() {}

export class Pricing extends Context.Tag("Pricing")<
  Pricing,
  { readonly amount: Effect.Effect<number> }
>() {}

export class PurePolicy extends Context.Tag("PurePolicy")<
  PurePolicy,
  { readonly decide: (inventory: number, price: number) => "accept" | "reject" }
>() {}

export class EffectfulPolicy extends Context.Tag("EffectfulPolicy")<
  EffectfulPolicy,
  { readonly decide: (inventory: number) => Effect.Effect<boolean> }
>() {}

export const placeOrder = Effect.gen(function* () {
  const inventory = yield* Inventory
  const pricing = yield* Pricing
  const available = yield* inventory.available
  const amount = yield* pricing.amount

  if (available <= 0) {
    return "reject" as const
  }

  if (amount > 100) {
    return "reject" as const
  }

  return "accept" as const
})
