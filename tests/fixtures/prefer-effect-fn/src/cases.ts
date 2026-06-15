import { Effect } from "effect"

export const fetchUser = (id: number) => Effect.succeed(id)
export const getCount = (id: number): Effect.Effect<number> => Effect.succeed(id)
export const compute = (n: number) => Effect.gen(function* () { return n * 2 })
export const load = function (id: number) { return Effect.succeed(id) }
export const failWith = (code: number, message: string) => Effect.fail({ code, message })
