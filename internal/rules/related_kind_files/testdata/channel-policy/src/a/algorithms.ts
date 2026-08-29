import type { Effect } from "effect"
import type { RepoA, User, UserError } from "../types"
export declare function first(input: Effect.Effect<User, UserError, RepoA>): User
