import { Option } from "effect"
import type { User } from "./modules/user.js"
import type { Organization } from "./modules/organization.js"

type UserName = string

type Handler = (user: User) => void

const makeFunction = <A extends ReadonlyArray<unknown>, R>(
  implementation: (...args: A) => R
): ((...args: A) => R) => implementation

const updateUser = (id: string, newData: User): User => ({
  ...newData,
  id
})

function archiveUser(reason: string, user: User): User {
  return user
}

const saveUser = makeFunction((timestamp: Date, user: User): User => user)

const renameUser =
  (name: string) =>
  (user: User): User => ({
    ...user,
    name
  })

const updateOrganization = (
  id: string,
  organization: Organization
): Organization => ({
  ...organization,
  id
})

const parseAge = (user: User, value: string): number => Number(value)

const countUsers = (users: ReadonlyArray<User>): number => users.length

const inspectOption = (maybeUser: Option.Option<User>): Option.Option<User> =>
  maybeUser

const normalizeUserName = (name: UserName): string => name

const registerHandler = (handler: Handler): Handler => handler
