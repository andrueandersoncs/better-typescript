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

    const [stock, price, ratings] = yield* Effect.all(
      [inventory.countAvailable(sku), pricing.currentPrice(sku), reviews.ratingsFor(sku)],
      { concurrency: "unbounded" },
    )

    return {
      sku,
      stock,
      priceCents: price.amountCents,
      averageRating: average(ratings),
    } satisfies ProductPage
  })

export const loadProductPages = (skus: ReadonlyArray<string>) =>
  Effect.forEach(skus, loadProductPage, { concurrency: 4 })
