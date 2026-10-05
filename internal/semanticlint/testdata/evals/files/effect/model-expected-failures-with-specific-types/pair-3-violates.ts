import * as Effect from "effect/Effect"

class RosterUnavailable {
  readonly _tag = "RosterUnavailable"
  constructor(readonly teamId: string) {}
}

type Member = {
  readonly id: string
  readonly name: string
}

const fetchRoster = (teamId: string): Effect.Effect<ReadonlyArray<Member>, RosterUnavailable> =>
  Effect.fail(new RosterUnavailable(teamId))

export const listMembers = (teamId: string) =>
  fetchRoster(teamId).pipe(
    Effect.catchTag("RosterUnavailable", () => Effect.succeed([]))
  )
