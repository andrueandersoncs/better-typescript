import { Data, Effect } from "effect"

export class IndexError extends Data.TaggedError("IndexError")<{
  readonly cause: unknown
}> {}

export interface Product {
  readonly sku: string
  readonly title: string
  readonly tags: ReadonlyArray<string>
}

interface SearchClient {
  readonly bulkIndex: (index: string, docs: ReadonlyArray<unknown>) => Promise<void>
  readonly refresh: (index: string) => Promise<void>
}

const toDocument = (product: Product) => ({
  id: product.sku,
  title: product.title.toLowerCase(),
  tags: [...product.tags].sort(),
})

export const indexProducts = (
  client: SearchClient,
  index: string,
  products: ReadonlyArray<Product>,
) => {
  const docs = products.map(toDocument)
  const pending = client.bulkIndex(index, docs)
  return Effect.tryPromise({
    try: () => pending,
    catch: (cause) => new IndexError({ cause }),
  })
}

export const refreshIndex = (client: SearchClient, index: string) =>
  Effect.tryPromise({
    try: () => client.refresh(index),
    catch: (cause) => new IndexError({ cause }),
  })

export const reindex = (client: SearchClient, index: string, products: ReadonlyArray<Product>) =>
  indexProducts(client, index, products).pipe(Effect.zipRight(refreshIndex(client, index)))
