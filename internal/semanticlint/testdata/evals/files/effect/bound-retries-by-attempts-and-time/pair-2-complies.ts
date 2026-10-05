import * as Effect from "effect/Effect"
import * as Schedule from "effect/Schedule"

type DirectoryFault =
  | { readonly _tag: "NetworkIssue" }
  | { readonly _tag: "InvalidToken" }

const listTeams = (): Effect.Effect<ReadonlyArray<string>, DirectoryFault> =>
  Effect.fail({ _tag: "NetworkIssue" })

export const collectTeams = () => {
  const plan = Schedule.upTo(Schedule.exponential("100 millis"), { times: 4, duration: "5 seconds" })
  return listTeams().pipe(
    Effect.retry({
      schedule: plan,
      while: (error) => error._tag === "NetworkIssue"
    })
  )
}
