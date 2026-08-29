import type { Effect } from "effect"
import type { User, UserError, UserRepository } from "../types"

export declare const findUser: (user: User) => Effect.Effect<UserError, never, UserRepository>
