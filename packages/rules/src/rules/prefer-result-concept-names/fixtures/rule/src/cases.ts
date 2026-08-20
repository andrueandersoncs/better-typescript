import { Array, Option } from "effect"

interface Customer {
  readonly active: boolean
  readonly id: string
  readonly name: string
}

interface Absent {
  readonly _tag: "Absent"
}

type Present<A> =
  | Absent
  | {
      readonly _tag: "Present"
      readonly value: A
    }

const present = <A>(value: A): Present<A> => ({ _tag: "Present", value })

export const selectedCustomer = (customer: Customer): string => customer.name // ~detect 14

export const resolvedCustomer = (customer: Customer): string => { // ~detect 14
  const identifier = customer.id

  return identifier
}

export const chosenCustomer = (customer: Customer): Present<string> => // ~detect 14
  present(customer.name)

export const declaredCustomer = (customer: Customer): Option.Option<string> => // ~detect 14
  Option.gen(function* () {
    yield* Option.liftPredicate((active: boolean) => active)(customer.active)

    return yield* Option.liftPredicate((name: string) => name.length > 0)(customer.name)
  })

export const selectedCustomers = (customers: ReadonlyArray<Customer>) => // ~detect 14
  Array.map(customers, (customer) => customer.name)

export function selectedCustomerId(customer: Customer): string { // ~detect 17
  return customer.name
}

export class CustomerReader {
  selectedCustomer(customer: Customer): string { // ~detect 3
    return customer.name
  }
}

export class CustomerView {
  constructor(private readonly customer: Customer) {}

  selectedCustomer(): string { // ~detect 3
    return this.customer.name
  }
}

export const selectedRecord = (record: Readonly<Record<string, string>>): string => // ~detect 14
  record["label"]
