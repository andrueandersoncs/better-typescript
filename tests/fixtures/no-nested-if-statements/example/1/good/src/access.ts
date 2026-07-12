import { Option, Struct, pipe } from "effect"

interface User {
  readonly isActive: boolean
}

declare const user: User | null
declare const grantAccess: () => string

export const accessToken = pipe(
  Option.fromNullable(user),
  Option.filter(Struct.get("isActive")),
  Option.map(grantAccess)
)
