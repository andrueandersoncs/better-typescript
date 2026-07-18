interface User {
  readonly name: string
}

interface Order {
  readonly id: string
}

interface Json {
  readonly payload: string
}

export const userFromJson = (order: Order): Order => order // ~detect 14,14

export const jsonToUser = (user: User): Json => ({ payload: user.name }) // ~detect 14,14

export const transformJsonToUser = (user: User): Json => ({ payload: user.name }) // ~detect 14,14

export const parseUser = (json: Json): Order => ({ id: json.payload }) // ~detect 14

export const encodeJson = (user: User): User => user // ~detect 14

export const decodeOrder = (json: Json): User => ({ name: json.payload }) // ~detect 14

export function formatJson(user: User): string { // ~detect 17
  return user.name
}

export class Converter {
  userFromJson(order: Order): Order { // ~detect 3,3
    return order
  }

  parseUser(json: Json): Order { // ~detect 3
    return { id: json.payload }
  }
}
