interface Customer {
  readonly name: string
}

export const customerName = (customer: Customer): string => customer.name
