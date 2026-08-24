import { Effect } from "effect"
const worker = Effect.forkDaemon(Effect.never)
