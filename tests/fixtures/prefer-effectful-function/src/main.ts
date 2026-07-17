import { Effect } from "effect"

const program = Effect.log("started")

export const run = () => Effect.runSync(program)
