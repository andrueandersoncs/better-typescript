import * as Schema from "effect/Schema"

const PurchaseSchema = Schema.Struct({
  reference: Schema.String,
  total: Schema.Number
})

type Purchase = {
  readonly reference: string
  readonly total: number
}

type JsonResponse = { readonly json: () => Promise<unknown> }

export const receivePurchase = async (response: JsonResponse): Promise<Purchase> => {
  const body = await response.json()
  return body as Purchase
}

export const purchaseFields = PurchaseSchema
