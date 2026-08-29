import type { Effect } from "effect"
import type { SharedRepo } from "../types"
export interface FirstRunner { run(): Effect.Effect<void, never, SharedRepo> }
