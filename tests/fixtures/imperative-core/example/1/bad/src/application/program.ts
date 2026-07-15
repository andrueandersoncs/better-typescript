import { Effect, Ref } from "effect"

const program = Effect.succeed("ready")

export const running = Effect.runPromise(program)
export const sharedState = Ref.makeUnsafe(0)
