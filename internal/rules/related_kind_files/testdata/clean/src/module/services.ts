import { Context, type Effect } from "effect"
import type { User } from "./types"
export declare const UserService: Context.Service<UserService, { readonly get: () => Effect.Effect<User> }>
export class UserServiceClass extends Context.Service<UserServiceClass>() {}
import { Service as ServiceModel } from "effect"
export class AliasService extends ServiceModel<AliasService>() {}
