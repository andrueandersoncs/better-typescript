interface Customer {
  readonly name: string
}

export const selectedCustomer = (customer: Customer): string => customer.name
