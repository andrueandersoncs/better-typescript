import { CsvWriter } from "../exports/CsvWriter"

type Invoice = { number: string; total: number; customer: string }

export class InvoiceExporter {
  constructor(private readonly writer: CsvWriter) {}

  async export(invoices: ReadonlyArray<Invoice>) {
    const rows = invoices.map((invoice) => [
      invoice.number,
      invoice.customer,
      invoice.total.toFixed(2),
    ])

    return this.writer.write("invoices.csv", ["number", "customer", "total"], rows)
  }
}

export function createInvoiceExporter() {
  return new InvoiceExporter(new CsvWriter())
}
