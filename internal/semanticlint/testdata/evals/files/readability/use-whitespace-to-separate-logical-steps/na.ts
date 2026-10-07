export type CurrencyCode =
  | "AUD"
  | "CAD"
  | "EUR"
  | "GBP"
  | "USD"

export const currencySymbols: Record<CurrencyCode, string> = {
  AUD: "$",
  CAD: "$",
  EUR: "€",
  GBP: "£",
  USD: "$",
}
