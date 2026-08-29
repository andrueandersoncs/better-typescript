import type { Effect } from "effect"
import type { User } from "../types"
export declare function firstGeneric<T extends User>(value: T): Effect.Effect<T>
