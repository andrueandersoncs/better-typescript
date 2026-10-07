type Customer = {
  readonly id: string
  readonly displayName: string
}

export const sortCustomers = (customers: readonly Customer[]): Customer[] =>
  [...customers].sort((left, right) => {
    const collator = new Intl.Collator("en", { sensitivity: "base" })
    return collator.compare(left.displayName, right.displayName)
  })

export const firstCustomerName = (customers: readonly Customer[]): string | undefined =>
  sortCustomers(customers).at(0)?.displayName
