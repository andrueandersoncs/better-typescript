import { Context, Effect } from "effect"

export class Catalog extends Context.Service<
  Catalog,
  { readonly size: Effect.Effect<number> }
>()("Catalog") {}

interface ShippingShape {
  readonly fee: Effect.Effect<number>
}

export const Shipping = Context.Service<ShippingShape>("Shipping")

const double = (value: number): number => value * 2
const bump = (value: number): number => value + 1
const label = (value: number): string => `total=${value}`

export const quoteShipment = Effect.gen(function* () {
  const catalog = yield* Catalog
  const shipping = yield* Shipping
  const size = yield* catalog.size
  const fee = yield* shipping.fee
  const scaled = double(size)
  const raised = bump(fee)
  return label(scaled + raised)
})
