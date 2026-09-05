import { Effect, Option, Stream } from "effect"

type Page = { readonly items: ReadonlyArray<number>; readonly nextCursor: string | undefined }
declare const fetchPage: (cursor: string) => Effect.Effect<Page>

const pages = Stream.paginate("start", cursor =>
  Effect.map(fetchPage(cursor), page => [
    page.items,
    page.nextCursor === undefined ? Option.none() : Option.some(page.nextCursor),
  ] as const),
)

const bytes = [1, 2, 3]
const copied: number[] = []
for (let offset = 0; offset < bytes.length; offset++) {
  copied.push(bytes[offset])
}
