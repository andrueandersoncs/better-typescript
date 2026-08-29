import type { Effect } from "effect"
import type { Cron } from "../types"
export declare const startCron: () => Effect.Effect<void, never, Cron>
