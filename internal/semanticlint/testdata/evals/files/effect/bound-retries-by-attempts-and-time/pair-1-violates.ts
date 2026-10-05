import * as Effect from "effect/Effect"
import * as Schedule from "effect/Schedule"

type TransportFault =
  | { readonly _tag: "NetworkIssue" }
  | { readonly _tag: "AccessDenied" }

const readRoster = (group: string): Effect.Effect<ReadonlyArray<string>, TransportFault> =>
  Effect.fail({ _tag: "NetworkIssue" })

export const loadRoster = (group: string) => {
  const plan = Schedule.recurs(3)
  return readRoster(group).pipe(
    Effect.retry({
      schedule: plan,
      while: (error) => error._tag === "NetworkIssue"
    })
  )
}
