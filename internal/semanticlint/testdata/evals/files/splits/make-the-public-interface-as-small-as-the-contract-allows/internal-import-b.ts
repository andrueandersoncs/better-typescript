import { normalizeAccountCode } from "../accounts"

type Invoice = {
  readonly accountCode: string
  readonly amount: number
}

type PostedInvoice = {
  readonly accountCode: string
  readonly amount: number
}

export const postInvoice = (invoice: Invoice): PostedInvoice => {
  const accountCode = normalizeAccountCode(invoice.accountCode)
  return { accountCode, amount: invoice.amount }
}
