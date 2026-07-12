import { Array, Option } from "effect"

interface User {
  readonly id: string
  readonly name: string
}

declare const users: ReadonlyArray<User>

export const findUser = (id: string): Option.Option<User> =>
  Array.findFirst(users, (user) => user.id === id)
