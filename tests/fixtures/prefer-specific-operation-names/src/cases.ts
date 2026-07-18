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

const getUser = (id: string): User => ({ id, name: id })

const findUser = (id: string): User | undefined => (id.length > 0 ? { id, name: id } : undefined)

declare let writtenName: string

// Vague operations with a unique stronger role evidenced by the body.
export const processCustomer = (input: unknown): Customer => decode(input) // ~detect 14

export const processUserRecord = (input: unknown): Customer => // ~detect 14
  makeCustomer(decode(input).id, decode(input).name, true)

export const processName = (customer: Customer): string => customer.name // ~detect 14

export const manageUsers = (users: ReadonlyArray<Customer>): number => // ~detect 14
  users.reduce((total, user) => total + (user.active ? 1 : 0), 0)

export const runUser = (id: string): User => getUser(id) // ~detect 14

export const executeUser = (id: string): User | undefined => findUser(id) // ~detect 14

export const processUser = (user: User): void => { // ~detect 14
  writtenName = user.name
}

export const doCustomer = (input: unknown): Customer => decode(input) // ~detect 14

export function handleCustomer(input: unknown): Customer { // ~detect 17
  return decode(input)
}

export class CustomerPipeline {
  processCustomer(input: unknown): Customer { // ~detect 3
    return decode(input)
  }

  processName(customer: Customer): string { // ~detect 3
    return customer.name
  }
}
