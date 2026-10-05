import * as Schema from "effect/Schema"

const InventoryEventSchema = Schema.Struct({
  sku: Schema.String,
  quantity: Schema.Number
})

type InventoryEvent = Schema.Schema.Type<typeof InventoryEventSchema>

const reserve = (event: InventoryEvent): string => `${event.sku}:${event.quantity}`

export const processMessage = (message: unknown): string => {
  const event = Schema.decodeUnknownSync(InventoryEventSchema)(message)
  return reserve(event)
}

export const inventoryFields = InventoryEventSchema
