async function loadAll() {
  let nextCursor: string | undefined = "start"
  const pages: unknown[] = []
  while (nextCursor) { pages.push(await Promise.resolve(nextCursor)); nextCursor = undefined }
  return pages
}
