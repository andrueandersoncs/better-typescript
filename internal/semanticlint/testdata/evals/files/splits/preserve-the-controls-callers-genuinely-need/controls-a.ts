import * as Effect from "effect/Effect"

type CatalogError = {
  readonly message: string
}

const describeCatalogFailure = (): CatalogError => {
  return { message: "Catalog refresh failed" }
}

export const refreshCatalog = (endpoint: URL) => {
  return Effect.tryPromise({
    try: () => fetch(endpoint),
    catch: describeCatalogFailure,
  })
}
