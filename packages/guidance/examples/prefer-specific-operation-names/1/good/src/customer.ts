interface Customer {
  readonly id: string
  readonly name: string
}

const decode = (input: unknown): Customer => {
  const value = input as Customer
  return { id: value.id, name: value.name }
}

export const decodeCustomer = (input: unknown): Customer => decode(input)

export const processUserRecord = (customer: Customer): Customer => customer

export const handleClick = (_event: { readonly type: "click" }): void => {
  return
}
