import * as Schema from "effect/Schema"

const InventoryEventSchema = Schema.Struct({
  sku: Schema.String,
  quantity: Schema.Number
})

type InventoryEvent = {
  readonly sku: string
  readonly quantity: number
}

const reserve = (event: InventoryEvent): string => `${event.sku}:${event.quantity}`

export const processMessage = (message: unknown): string => {
  const event = message as InventoryEvent
  return reserve(event)
}

export const inventoryFields = InventoryEventSchema
