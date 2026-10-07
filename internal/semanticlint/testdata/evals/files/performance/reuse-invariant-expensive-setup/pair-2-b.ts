type Customer = {
  readonly id: string
  readonly displayName: string
}

const customerNameCollator = new Intl.Collator("en", { sensitivity: "base" })

export const sortCustomers = (customers: readonly Customer[]): Customer[] =>
  [...customers].sort((left, right) =>
    customerNameCollator.compare(left.displayName, right.displayName))

export const firstCustomerName = (customers: readonly Customer[]): string | undefined =>
  sortCustomers(customers).at(0)?.displayName
