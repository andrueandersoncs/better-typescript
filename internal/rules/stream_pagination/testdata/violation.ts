type Page = { readonly items: ReadonlyArray<number>; readonly nextCursor: string | undefined }
declare const fetchPage: (cursor: string) => Promise<Page>
declare const audit: (cursor: string) => Promise<void>

async function loadAll() {
  let cursor: string | undefined = "start"
  const results: number[] = []
  while (cursor) {
    const ignored = await audit(cursor)
    const page = await fetchPage(cursor)
    results.push(...page.items)
    cursor = page.nextCursor
    ignored
  }
  return results
}
