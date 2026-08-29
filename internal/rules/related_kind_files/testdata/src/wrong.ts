import type { Config, Context, Effect, Layer, Schema } from "effect"
import type { PlacementData, User } from "./types"

export declare const userSchema: Schema.Schema<User>
export type UserFromSchema = typeof userSchema.Type
export declare class UserFailure extends Error {}
export declare const UserService: Context.Service<UserService, { readonly get: () => Effect.Effect<User> }>
export declare const UserLayer: Layer.Layer<UserService>
export declare const userConfig: Config.Config<User>
export declare const loadUser: (value: PlacementData) => Effect.Effect<PlacementData>
export declare const program: Effect.Effect<PlacementData>
export declare const normalizeUser: (value: PlacementData) => PlacementData
export interface UserView { readonly user: User }
export declare const defaultUser: User
