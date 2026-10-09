import { Effect } from "effect"
import type { AuditLog, PermissionStore } from "./ports"
import { RoleNotFound, type RoleId, type UserId } from "./model"

export interface GrantRoleInput {
  readonly actor: UserId
  readonly subject: UserId
  readonly role: RoleId
}

const describeGrant = (input: GrantRoleInput): string =>
  `${input.actor} granted ${input.role} to ${input.subject}`

export const grantRole = (
  store: PermissionStore,
  audit: AuditLog,
  input: GrantRoleInput,
): Effect.Effect<void, RoleNotFound> =>
  Effect.gen(function* () {
    const role = yield* store.findRole(input.role)
    yield* store.addMember(role.id, input.subject)
    yield* audit.record({ kind: "role.granted", message: describeGrant(input) })
  })

/** Whether a role id refers to one of the built-in roles. Pure. */
export const isBuiltInRole = (role: RoleId): boolean =>
  role === "owner" || role === "admin" || role === "viewer"
