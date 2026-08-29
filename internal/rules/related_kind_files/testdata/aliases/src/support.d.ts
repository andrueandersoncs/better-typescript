import type { Effect } from "effect"
import type { UserError, UserRepository } from "./types"
export type UserEffect<A> = Effect.Effect<A, UserError, UserRepository>
import type { Order, OrderError, User } from "./types"
export type UserOrOrderEffect = Effect.Effect<User, UserError, UserRepository> | Effect.Effect<Order, OrderError, UserRepository>
