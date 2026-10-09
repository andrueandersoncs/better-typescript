import { Effect } from "effect"
import { StockRepo, type StockLevel } from "./StockRepo"

export interface Reservation {
  readonly sku: string
  readonly quantity: number
  readonly orderId: string
}

export const reserve = (r: Reservation) =>
  Effect.gen(function* () {
    const repo = yield* StockRepo
    const level: StockLevel = yield* repo.get(r.sku)
    if (level.available < r.quantity) {
      return yield* Effect.fail({ _tag: "InsufficientStock" as const, sku: r.sku })
    }
    yield* repo.update(r.sku, { ...level, available: level.available - r.quantity, reserved: level.reserved + r.quantity })
  })

export const release = (r: Reservation) =>
  Effect.gen(function* () {
    const repo = yield* StockRepo
    const level = yield* repo.get(r.sku)
    yield* repo.update(r.sku, { ...level, available: level.available + r.quantity, reserved: level.reserved - r.quantity })
  })
