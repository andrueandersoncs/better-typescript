type Invoice = {
  readonly number: string
  readonly total: number
}

type Account = {
  readonly currency: string
  readonly locale: string
}

export const reviewInvoice = async (invoiceNumber: string, accountId: string) => {
  const invoice = await fetch(`/billing/invoices/${invoiceNumber}`).then((response) => response.json() as Promise<Invoice>)
  const account = await fetch(`/billing/accounts/${accountId}`).then((response) => response.json() as Promise<Account>)

  return {
    invoice,
    currency: account.currency,
    locale: account.locale
  }
}
