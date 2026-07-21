import { Option } from "effect"

interface User {
  readonly id: string
  readonly name: string
}

declare const users: ReadonlyArray<User>

export const findUser = (id: string): Option.Option<User> =>
  Option.fromNullishOr(users.find((user) => user.id === id))

export const requireUser = (id: string): User => users[0]!
