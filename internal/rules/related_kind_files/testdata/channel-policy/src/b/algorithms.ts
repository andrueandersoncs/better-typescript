import type { Effect } from "effect"
import type { RepoB, User, UserError } from "../types"
export declare function second(input: Effect.Effect<User, UserError, RepoB>): User
