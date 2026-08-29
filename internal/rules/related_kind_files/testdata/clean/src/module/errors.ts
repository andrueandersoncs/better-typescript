import { Schema } from "effect"
export declare class UserFailure extends Error {}
export class MissingUser extends Schema.TaggedError<MissingUser>() {}
import { TaggedError as ErrorModel } from "effect"
export class MissingAlias extends ErrorModel<MissingAlias>() {}
