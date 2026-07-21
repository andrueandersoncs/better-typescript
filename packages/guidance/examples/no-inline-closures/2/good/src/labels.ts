import { Array } from "effect"

interface User {
  readonly name: string
}

declare const users: ReadonlyArray<User>

export const labels = Array.map(users, (user) => user.name.toUpperCase())
