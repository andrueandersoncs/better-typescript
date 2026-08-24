import { Effect } from "effect"
const program = Effect.succeed(1)
export const run = () => Effect.runSync(program)
