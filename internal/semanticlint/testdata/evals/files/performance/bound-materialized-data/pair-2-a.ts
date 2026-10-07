import { readFile } from "node:fs/promises"

type ImportBatch = {
  readonly accountId: string
  readonly entries: ReadonlyArray<{ readonly amount: number }>
}

export const readImportBatch = async (path: string): Promise<ImportBatch> => {
  const contents = await readFile(path, "utf8")
  const batch = JSON.parse(contents) as ImportBatch
  if (batch.entries.length === 0) {
    throw new Error("Import batch must contain an entry")
  }
  return batch
}
