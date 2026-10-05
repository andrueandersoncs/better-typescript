import * as Effect from "effect/Effect"
import * as Schedule from "effect/Schedule"

type TransportFault =
  | { readonly _tag: "NetworkIssue" }
  | { readonly _tag: "AccessDenied" }

const readRoster = (group: string): Effect.Effect<ReadonlyArray<string>, TransportFault> =>
  Effect.fail({ _tag: "NetworkIssue" })

export const loadRoster = (group: string) => {
  const plan = Schedule.upTo(Schedule.spaced("200 millis"), { times: 3, duration: "4 seconds" })
  return readRoster(group).pipe(
    Effect.retry({
      schedule: plan,
      while: (error) => error._tag === "NetworkIssue"
    })
  )
}
