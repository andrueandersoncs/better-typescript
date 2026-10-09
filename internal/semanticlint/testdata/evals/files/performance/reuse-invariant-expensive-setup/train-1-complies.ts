import type { LedgerEntry } from "./ledger";

export interface StatementLine {
  readonly date: string;
  readonly description: string;
  readonly amount: string;
}

export interface StatementOptions {
  readonly locale: string;
  readonly currency: string;
}

const describe = (entry: LedgerEntry): string =>
  entry.memo.trim().length > 0 ? entry.memo.trim() : entry.counterparty;

export function renderStatementLines(
  entries: ReadonlyArray<LedgerEntry>,
  options: StatementOptions,
): ReadonlyArray<StatementLine> {
  const dateFormat = new Intl.DateTimeFormat(options.locale, { dateStyle: "medium" });

  const moneyFormat = new Intl.NumberFormat(options.locale, { style: "currency", currency: options.currency });

  return entries.map((entry) => {
    return {
      date: dateFormat.format(entry.postedAt),
      description: describe(entry),
      amount: moneyFormat.format(entry.amountCents / 100),
    };
  });
}
