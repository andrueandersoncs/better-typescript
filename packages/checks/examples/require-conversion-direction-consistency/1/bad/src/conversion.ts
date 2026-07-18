interface User {
  readonly name: string
}

interface Order {
  readonly id: string
}

interface Json {
  readonly payload: string
}

export const userFromJson = (order: Order): Order => order

export const jsonToUser = (user: User): Json => ({ payload: user.name })
