import { Schema as SchemaValue } from "effect"
import type { Schema } from "effect"
import type { User } from "./types"
export declare const userSchema: Schema.Schema<User>
export type UserFromSchema = typeof userSchema.Type
export class UserModel extends SchemaValue.Class<UserModel>() {}
import { Class as Model } from "effect"
export class AliasModel extends Model<AliasModel>() {}
