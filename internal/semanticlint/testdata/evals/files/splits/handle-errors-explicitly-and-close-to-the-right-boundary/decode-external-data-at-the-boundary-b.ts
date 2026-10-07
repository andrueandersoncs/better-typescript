type Customer = {
  readonly id: string
  readonly email: string
}

type CustomerResponse = {
  readonly json: () => Promise<unknown>
}

const decodeCustomer = (payload: unknown): Customer => {
  if (typeof payload !== "object" || payload === null) throw new Error("Invalid customer")
  if (!("id" in payload) || !("email" in payload)) throw new Error("Invalid customer")
  const { id, email } = payload
  if (typeof id !== "string" || typeof email !== "string") throw new Error("Invalid customer")
  return { id, email }
}

export const customerFromResponse = async (
  response: CustomerResponse,
): Promise<Customer> => {
  const payload = await response.json()
  return decodeCustomer(payload)
}
