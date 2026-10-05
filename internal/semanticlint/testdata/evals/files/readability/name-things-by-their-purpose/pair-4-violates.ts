type Customer = {
  readonly id: string
  readonly email: string
}

type Invoice = {
  readonly customerId: string
  readonly total: number
}

export const invoicesForCustomer = (
  customerCustomerId: string,
  invoices: ReadonlyArray<Invoice>
): ReadonlyArray<Invoice> =>
  invoices.filter((invoice) => invoice.customerId === customerCustomerId)

export const customerEmail = (customer: Customer): string => customer.email
