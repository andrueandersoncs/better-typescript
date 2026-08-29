import type { Effect } from "effect"
import type { User } from "../types"
export declare function secondGeneric<T extends User>(value: T): Effect.Effect<T>
