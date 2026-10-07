import { BaseCsvExporter } from "../exports/BaseCsvExporter"

type Invoice = { number: string; total: number; customer: string }

export class InvoiceExporter extends BaseCsvExporter<Invoice> {
  protected override columns() {
    return ["number", "customer", "total"]
  }

  protected override values(invoice: Invoice) {
    return [invoice.number, invoice.customer, invoice.total.toFixed(2)]
  }

  async export(invoices: ReadonlyArray<Invoice>) {
    this.beginFile("invoices.csv")
    for (const invoice of invoices) {
      this.appendRow(this.values(invoice))
    }
    return this.finishFile()
  }
}
