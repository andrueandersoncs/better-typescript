import { createHash } from "node:crypto"

export interface ExportRow {
  readonly id: string
  readonly amountCents: number
  readonly currency: string
}

export interface SealedLedger {
  readonly accountId: string
  readonly rows: ReadonlyArray<ExportRow>
  readonly digest: string
}

export const sealLedger = (accountId: string, rows: ReadonlyArray<ExportRow>): SealedLedger => {
  const hash = createHash("sha256")
  for (const row of rows) {
    hash.update(`${row.id}:${row.amountCents}:${row.currency}`)
  }
  return { accountId, rows, digest: hash.digest("hex") }
}

export const toCsv = (ledger: SealedLedger): string => {
  const header = `# account=${ledger.accountId} digest=${ledger.digest}`
  const lines = ledger.rows.map((row) => `${row.id},${row.amountCents},${row.currency}`)
  return [header, "id,amount_cents,currency", ...lines].join("\n")
}

export const exportLedger = (accountId: string, rows: ReadonlyArray<ExportRow>): string =>
  toCsv(sealLedger(accountId, rows))
