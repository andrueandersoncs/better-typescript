export type InvoiceState =
  | "draft"
  | "issued"
  | "paid"
  | "void"

export const invoiceStateLabels: Record<InvoiceState, string> = {
  draft: "Draft",
  issued: "Issued",
  paid: "Paid",
  void: "Void",
}

export const terminalInvoiceStates: ReadonlySet<InvoiceState> = new Set(["paid", "void"])
