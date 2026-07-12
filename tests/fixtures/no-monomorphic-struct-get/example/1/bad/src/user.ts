import { Struct } from "effect"

interface User {
  readonly name: string
}

const getName: (user: User) => string = Struct.get("name")

export const label = getName
