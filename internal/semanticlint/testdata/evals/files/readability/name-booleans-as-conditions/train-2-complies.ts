import { Effect } from "effect"
import { FeatureFlags } from "./FeatureFlags"
import { AccountRepo } from "./AccountRepo"

export interface ExportRequest {
  readonly accountId: string
  readonly format: "csv" | "parquet"
}

export const authorizeExport = (request: ExportRequest) =>
  Effect.gen(function* () {
    const flags = yield* FeatureFlags
    const accounts = yield* AccountRepo

    const account = yield* accounts.byId(request.accountId)
    const isParquetEnabled = yield* flags.isEnabled("parquet-export", account.id)
    const hasExportSeat = account.seats.some((seat) => seat.role === "exporter")

    if (!hasExportSeat) {
      return yield* Effect.fail({ _tag: "ExportNotPermitted" as const, accountId: account.id })
    }

    if (request.format === "parquet" && !isParquetEnabled) {
      return yield* Effect.fail({ _tag: "FormatUnavailable" as const, format: request.format })
    }

    return { account, format: request.format }
  })
