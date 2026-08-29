import type { Effect } from "effect"
import type { Cron } from "../types"
export declare const stopCron: () => Effect.Effect<void, never, Cron>
