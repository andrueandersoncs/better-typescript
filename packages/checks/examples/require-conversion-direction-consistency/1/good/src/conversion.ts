interface User {
  readonly name: string
}

interface Json {
  readonly payload: string
}

export const userFromJson = (json: Json): User => ({ name: json.payload })

export const jsonToUser = (json: Json): User => ({ name: json.payload })
