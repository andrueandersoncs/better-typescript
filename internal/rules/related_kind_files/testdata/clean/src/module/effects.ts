import type { Effect } from "effect"
import type { User } from "./types"
export declare const loadUser: (user: User) => Effect.Effect<User>
