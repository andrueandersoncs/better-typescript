export interface User {
  readonly name: string
}

export const makeUser = (name: string): User => ({ name })

export const saveUser = (user: User) => user.name

export function isEven(value: number): boolean {
  return value === 0 || isOdd(value - 1)
}

export function isOdd(value: number): boolean {
  return value !== 0 && isEven(value - 1)
}


export const trimOrderId = (value: string) => value.trim()

export const normalizeOrder = (value: string) => trimOrderId(value)

export const parseOrder = (value: string) => normalizeOrder(value)

export const unownedHelper = () => "unowned"

export const ownedConsumer = () => unownedHelper()

void unownedHelper
export class Service {}

export class Client extends Service {
  readonly ready = true
}
