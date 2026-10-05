type Customer = {
  readonly id: string
  readonly email: string
}

type Invoice = {
  readonly customerId: string
  readonly total: number
}

export const invoicesForCustomer = (
  id: string,
  invoices: ReadonlyArray<Invoice>
): ReadonlyArray<Invoice> =>
  invoices.filter((invoice) => invoice.customerId === id)

export const customerEmail = (customer: Customer): string => customer.email
