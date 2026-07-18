interface Customer {
  readonly id: string
  readonly name: string
  readonly active: boolean
}

interface User {
  readonly id: string
  readonly name: string
}

const decode = (input: unknown): Customer => {
  const value = input as Customer
  return { id: value.id, name: value.name, active: value.active }
}

const makeCustomer = (id: string, name: string, active: boolean): Customer => ({
  id,
  name,
  active
})

// Specific operations already match the evidenced role.
export const decodeCustomer = (input: unknown): Customer => decode(input)

export const makeUserRecord = (input: unknown): Customer =>
  makeCustomer(decode(input).id, decode(input).name, true)

export const customerName = (customer: Customer): string => customer.name

// Conventional handlers/callbacks and runtime entrypoints stay quiet.
export const handleClick = (_event: { readonly type: "click" }): void => {
  return
}

export const handleSubmit = (_event: { readonly type: "submit" }): void => undefined

export const processHandler = (customer: Customer): string => customer.name

export const runCallback = (customer: Customer): string => customer.name

export const main = (): void => undefined

export const bootstrap = (): void => undefined

// Ambiguous multi-step flow with more than one stronger role evidenced.
export const processMixed = (
  input: unknown,
  users: ReadonlyArray<Customer>
): Customer | number => {
  if (users.length === 0) {
    return decode(input)
  }

  return users.reduce((total, user) => total + (user.active ? 1 : 0), 0)
}

const getActiveCustomer = (customer: Customer): Customer =>
  customer.active ? customer : makeCustomer(customer.id, customer.name, true)

// Vague name without stronger-role evidence.
export const processValue = (value: string): string => value.trim()

export const manageLabel = (user: User): string => `${user.id}:${user.name}`

export const doWork = (left: number, right: number): number => left + right

export class CustomerPipeline {
  decodeCustomer(input: unknown): Customer {
    return decode(input)
  }

  handleClick(_event: { readonly type: "click" }): void {
    return
  }
}
