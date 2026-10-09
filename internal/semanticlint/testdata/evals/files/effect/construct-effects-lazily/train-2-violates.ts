import { Effect } from "effect"
import { FileSystem } from "@effect/platform"
import { gzipSync } from "node:zlib"

export interface ReportRow {
  readonly region: string
  readonly month: string
  readonly revenueCents: number
}

const header = "region,month,revenue_cents"

const toCsv = (rows: ReadonlyArray<ReportRow>): string =>
  [header, ...rows.map((row) => `${row.region},${row.month},${row.revenueCents}`)].join("\n")

export const compressReport = (rows: ReadonlyArray<ReportRow>) =>
  Effect.succeed(gzipSync(Buffer.from(toCsv(rows)), { level: 9 }))

export const writeArchive = (path: string, rows: ReadonlyArray<ReportRow>) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const bytes = yield* compressReport(rows)
    yield* fs.writeFile(path, bytes)
    yield* Effect.logInfo(`wrote ${rows.length} rows to ${path}`)
    return bytes.byteLength
  })

export const writeArchives = (
  targets: ReadonlyArray<{ readonly path: string; readonly rows: ReadonlyArray<ReportRow> }>,
) => Effect.forEach(targets, ({ path, rows }) => writeArchive(path, rows), { concurrency: 2 })
