import { Effect } from "effect"
import { InventoryRepo } from "./InventoryRepo"
import { PricingClient } from "./PricingClient"
import { ReviewsClient } from "./ReviewsClient"

export interface ProductPage {
  readonly sku: string
  readonly stock: number
  readonly priceCents: number
  readonly averageRating: number
}

const average = (ratings: ReadonlyArray<number>): number =>
  ratings.length === 0 ? 0 : ratings.reduce((sum, r) => sum + r, 0) / ratings.length

export const loadProductPage = (sku: string) =>
  Effect.gen(function* () {
    const inventory = yield* InventoryRepo
    const pricing = yield* PricingClient
    const reviews = yield* ReviewsClient

    const stock = yield* inventory.countAvailable(sku)
    const price = yield* pricing.currentPrice(sku)
    const ratings = yield* reviews.ratingsFor(sku)

    return {
      sku,
      stock,
      priceCents: price.amountCents,
      averageRating: average(ratings),
    } satisfies ProductPage
  })

export const loadProductPages = (skus: ReadonlyArray<string>) =>
  Effect.forEach(skus, loadProductPage, { concurrency: 4 })
