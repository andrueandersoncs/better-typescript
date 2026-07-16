import { Struct } from "effect"

interface User {
  readonly name: string
}

export const getName: (user: User) => string = Struct.get("name")
