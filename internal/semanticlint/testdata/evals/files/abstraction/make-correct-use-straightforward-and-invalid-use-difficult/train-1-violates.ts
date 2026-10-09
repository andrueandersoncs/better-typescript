import { createHash } from "node:crypto"

export interface ExportRow {
  readonly id: string
  readonly amountCents: number
  readonly currency: string
}

export class LedgerExport {
  private rows: ReadonlyArray<ExportRow> = []
  private digest: string | undefined

  constructor(private readonly accountId: string) {}

  load(rows: ReadonlyArray<ExportRow>): void {
    this.rows = rows
  }

  seal(): void {
    const hash = createHash("sha256")
    for (const row of this.rows) {
      hash.update(`${row.id}:${row.amountCents}:${row.currency}`)
    }
    this.digest = hash.digest("hex")
  }

  toCsv(): string {
    const header = `# account=${this.accountId} digest=${this.digest}`
    const lines = this.rows.map((row) => `${row.id},${row.amountCents},${row.currency}`)
    return [header, "id,amount_cents,currency", ...lines].join("\n")
  }
}

export const exportLedger = (accountId: string, rows: ReadonlyArray<ExportRow>): string => {
  const ledger = new LedgerExport(accountId)
  ledger.load(rows)
  ledger.seal()
  return ledger.toCsv()
}
