import type { Effect } from "effect"
import type { Order, User } from "../types"

export declare const loadUser: (user: User) => Effect.Effect<User>
export declare const loadOrder: (order: Order) => Effect.Effect<Order>
