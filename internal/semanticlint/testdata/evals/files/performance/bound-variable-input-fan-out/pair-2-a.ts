import * as Effect from "effect/Effect"

type SearchDocument = {
  readonly id: string
  readonly body: string
}

const index = (document: SearchDocument): Effect.Effect<void> =>
  Effect.promise(() => fetch(`https://search.example/documents/${document.id}`, {
    method: "PUT",
    body: document.body,
  }).then(() => undefined))

export const indexAll = (documents: readonly SearchDocument[]): Effect.Effect<void> =>
  Effect.all(documents.map(index)).pipe(Effect.asVoid)
