import { readFile, stat } from "node:fs/promises"

type ImportBatch = {
  readonly accountId: string
  readonly entries: ReadonlyArray<{ readonly amount: number }>
}

const maximumImportBytes = 2 * 1024 * 1024

export const readImportBatch = async (path: string): Promise<ImportBatch> => {
  const metadata = await stat(path)
  if (metadata.size > maximumImportBytes) {
    throw new Error("Import batch is too large")
  }
  const contents = await readFile(path, "utf8")
  const batch = JSON.parse(contents) as ImportBatch
  if (batch.entries.length === 0) {
    throw new Error("Import batch must contain an entry")
  }
  return batch
}
