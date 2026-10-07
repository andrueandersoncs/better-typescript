export type InvoiceTab = "details" | "history"

export type InvoicePanel = {
  readonly selectedTab: InvoiceTab
  readonly title: string
}

export const createInvoicePanel = (
  initialTab: InvoiceTab
): InvoicePanel => {
  const selectedTab = initialTab
  const title = initialTab === "details" ? "Invoice details" : "Invoice history"

  return { selectedTab, title }
}
