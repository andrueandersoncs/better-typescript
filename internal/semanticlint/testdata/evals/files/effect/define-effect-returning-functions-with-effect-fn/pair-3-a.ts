import * as Effect from "effect/Effect"

export interface InventoryItem {
  readonly sku: string
  readonly available: boolean
}

const inventory: Record<string, InventoryItem> = {}

export function findInventoryItem(sku: string) {
  return Effect.gen(function* () {
    return yield* Effect.succeed(inventory[sku] ?? { sku, available: false })
  })
}

export const inventoryRegion = "us-east-1"
