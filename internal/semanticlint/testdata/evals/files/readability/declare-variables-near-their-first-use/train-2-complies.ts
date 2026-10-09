import { Effect } from "effect"
import { InventoryRepo } from "./inventory-repo.js"
import { ReservationRepo } from "./reservation-repo.js"

export interface ReserveInput {
  readonly sku: string
  readonly quantity: number
  readonly cartId: string
}

export class OutOfStock {
  readonly _tag = "OutOfStock"
  constructor(readonly sku: string, readonly available: number) {}
}

export const reserveStock = (input: ReserveInput) =>
  Effect.gen(function* () {
    const inventory = yield* InventoryRepo
    const reservations = yield* ReservationRepo
    const item = yield* inventory.findBySku(input.sku)
    const held = yield* reservations.heldQuantity(input.sku)
    const available = item.onHand - held
    if (available < input.quantity) {
      return yield* Effect.fail(new OutOfStock(input.sku, available))
    }
    yield* inventory.touch(input.sku)
    const expiresAt = new Date(Date.now() + 15 * 60_000)
    return yield* reservations.insert({
      sku: input.sku,
      cartId: input.cartId,
      quantity: input.quantity,
      expiresAt
    })
  })
