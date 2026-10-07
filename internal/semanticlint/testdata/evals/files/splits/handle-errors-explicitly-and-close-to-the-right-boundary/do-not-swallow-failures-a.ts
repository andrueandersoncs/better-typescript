type Invoice = {
  readonly id: string
}

const requestInvoices = async (): Promise<readonly Invoice[]> => []
const cachedInvoices: readonly Invoice[] = []

export const invoicesForDashboard = async (): Promise<readonly Invoice[]> => {
  try {
    const invoices = await requestInvoices()
    return invoices
  } catch {
    return cachedInvoices
  }
}
