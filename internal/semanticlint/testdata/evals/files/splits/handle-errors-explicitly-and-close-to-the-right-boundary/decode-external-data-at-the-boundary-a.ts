type Customer = {
  readonly id: string
  readonly email: string
}

type CustomerResponse = {
  readonly json: () => Promise<unknown>
}

export const customerFromResponse = async (
  response: CustomerResponse,
): Promise<Customer> => {
  const payload = (await response.json()) as Customer
  return payload
}
