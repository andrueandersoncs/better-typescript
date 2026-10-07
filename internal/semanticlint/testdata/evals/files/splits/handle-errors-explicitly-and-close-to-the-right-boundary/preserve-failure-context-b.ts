type Invoice = {
  readonly id: string
}

const requestInvoice = async (invoiceId: string): Promise<Invoice> => ({
  id: invoiceId,
})

export const loadInvoice = async (invoiceId: string): Promise<Invoice> => {
  try {
    return await requestInvoice(invoiceId)
  } catch (error) {
    throw new Error("Invoice service was unavailable", { cause: error })
  }
}
