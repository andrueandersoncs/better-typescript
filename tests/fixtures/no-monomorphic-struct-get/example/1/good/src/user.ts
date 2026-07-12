import { Struct } from "effect"

interface User {
  readonly name: string
}

export const nameOf = (user: User): string => Struct.get("name")(user)
