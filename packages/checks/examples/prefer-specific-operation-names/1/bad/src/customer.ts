interface Customer {
  readonly id: string
  readonly name: string
}

const decode = (input: unknown): Customer => {
  const value = input as Customer
  return { id: value.id, name: value.name }
}

const makeCustomer = (id: string, name: string): Customer => ({ id, name })

export const processCustomer = (input: unknown): Customer => decode(input)

export const processUserRecord = (input: unknown): Customer =>
  makeCustomer(decode(input).id, decode(input).name)

export const handleClick = (_event: { readonly type: "click" }): void => {
  return
}
