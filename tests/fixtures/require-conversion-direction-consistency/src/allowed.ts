interface User {
  readonly name: string
}

interface Order {
  readonly id: string
}

interface Json {
  readonly payload: string
}

interface Group {
  readonly id: string
}

export const userFromJson = (json: Json): User => ({ name: json.payload })

export const jsonToUser = (json: Json): User => ({ name: json.payload })

export const parseUser = (json: Json): User => ({ name: json.payload })

export const encodeJson = (json: Json): string => json.payload

export const decodeOrder = (json: Json): Order => ({ id: json.payload })

export const serializeUser = (user: User): string => user.name

export const formatUser = (user: User): string => user.name

export const transformUser = (user: User): User => user

export const deserializeUser = (json: Json): User => ({ name: json.payload })

export const userToJson = (user: User): Json => ({ payload: user.name })

export const orderFromUser = (user: User): Order => ({ id: user.name })

// Command-style relations with "to" are not conversions.
export const addUserToGroup = (user: User, group: Group): Group => {
  void user
  return group
}

export const appendUserToOrder = (user: User, order: Order): Order => {
  void user
  return order
}

export class Converter {
  userFromJson(json: Json): User {
    return { name: json.payload }
  }

  jsonToUser(json: Json): User {
    return { name: json.payload }
  }
}
