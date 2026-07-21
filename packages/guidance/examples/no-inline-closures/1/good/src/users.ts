import { Array } from "effect"

interface User {
  readonly name: string
}

declare const users: ReadonlyArray<User>

const upperName = (user: User): string => user.name.toUpperCase()

export const names = Array.map(users, upperName)
