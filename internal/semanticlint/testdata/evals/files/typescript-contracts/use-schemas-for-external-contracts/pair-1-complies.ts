import * as Schema from "effect/Schema"

const PurchaseSchema = Schema.Struct({
  reference: Schema.String,
  total: Schema.Number
})

type Purchase = Schema.Schema.Type<typeof PurchaseSchema>

type JsonResponse = { readonly json: () => Promise<unknown> }

export const receivePurchase = async (response: JsonResponse): Promise<Purchase> => {
  const body = await response.json()
  return Schema.decodeUnknownSync(PurchaseSchema)(body)
}

export const purchaseFields = PurchaseSchema
