export type CurrencyCode = "USD" | "EUR";

export type LedgerEntry = {
  readonly reference: string;
  readonly currency: CurrencyCode;
};

export const createLedgerEntry = (
  reference: string,
  currency: CurrencyCode,
): LedgerEntry => ({
  reference,
  currency,
});
