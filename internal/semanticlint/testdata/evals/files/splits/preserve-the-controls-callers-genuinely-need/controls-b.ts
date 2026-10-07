import * as Effect from "effect/Effect"

type CatalogError = {
  readonly message: string
}

const describeCatalogFailure = (): CatalogError => {
  return { message: "Catalog refresh failed" }
}

export const refreshCatalog = (endpoint: URL, signal: AbortSignal) => {
  return Effect.tryPromise({
    try: () => fetch(endpoint, { signal }),
    catch: describeCatalogFailure,
  })
}
