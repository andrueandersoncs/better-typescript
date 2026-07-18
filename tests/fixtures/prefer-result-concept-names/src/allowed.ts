import { Array } from "effect"

interface Customer {
  readonly active: boolean
  readonly id: string
  readonly name: string
}

interface Box<A> {
  readonly value: A
}

interface Wish {
  readonly text: string
}

interface City {
  readonly name: string
}

const box = <A>(value: A): Box<A> => ({ value })
const format = (value: string): string => value.toUpperCase()
declare const wishValues: ReadonlyArray<Wish>
declare const cityValues: ReadonlyArray<City>

export const customerName = (customer: Customer): string => customer.name

export const nameFromCustomer = (customer: Customer): Box<string> => box(customer.name)

export const nameBox = (customer: Customer): Box<string> => box(customer.name)

export const customerLabel = (customer: Customer): string => format(customer.name)

export const customerNames = (customers: ReadonlyArray<Customer>) =>
  Array.map(customers, (customer) => customer.name)

export const activeCustomers = (customers: ReadonlyArray<Customer>) =>
  Array.filter(customers, (customer) => customer.active)
export const customerWishes = (): ReadonlyArray<Wish> => wishValues
export const nearbyCities = (): ReadonlyArray<City> => cityValues

export const selectedCustomer = (customer: Customer): string => {
  if (customer.active) {
    return customer.name
  }

  return customer.id
}

export const namedCustomer = (customer: Customer): Box<Customer> => box(customer)

export const declaredFileName = (file: { readonly fileName: string }): string => file.fileName

export class CustomerReader {
  customerName(customer: Customer): string {
    return customer.name
  }
}

export const createCustomer = (name: string): Customer => ({ active: true, id: name, name })
