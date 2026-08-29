import type { Effect } from "effect"
import type { SharedRepo } from "../types"
export interface SecondRunner { run(): Effect.Effect<void, never, SharedRepo> }
