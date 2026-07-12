import { Effect } from "effect"

declare const user: {
  readonly isActive: boolean
  readonly hasPermission: boolean
}
declare const grantAccess: () => Effect.Effect<void>

export const ensureAccess = Effect.fn(function* () {
  const canAccess = user.isActive && user.hasPermission

  if (canAccess) {
    yield* grantAccess()
  }
})
