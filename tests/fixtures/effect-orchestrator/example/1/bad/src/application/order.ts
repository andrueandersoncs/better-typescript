import { Context, Effect } from "effect"

export class Inventory extends Context.Service<
  Inventory,
  { readonly available: Effect.Effect<number> }
>()("Inventory") {}

export class Pricing extends Context.Service<
  Pricing,
  { readonly amount: Effect.Effect<number> }
>()("Pricing") {}

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
