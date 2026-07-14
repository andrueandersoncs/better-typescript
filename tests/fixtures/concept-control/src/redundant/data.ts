interface Customer {
  readonly customerIdentifier: string
}

type CustomerData = Customer

void ({} as CustomerData)
