import { Effect } from "effect"
import { program } from "./application/program.js"

export const running = Effect.runPromise(program)
