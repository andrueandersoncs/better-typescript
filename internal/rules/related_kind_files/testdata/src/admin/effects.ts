import type { Effect } from "effect"
import type { OtherRepository, User, UserError } from "../types"

export declare const removeUser: (error: UserError) => Effect.Effect<User, never, OtherRepository>
