import { Effect } from "effect"
const worker = Effect.forkScoped(Effect.never)
