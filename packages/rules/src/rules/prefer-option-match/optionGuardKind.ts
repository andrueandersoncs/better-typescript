import { Array, Schema } from "effect"

const optionGuardKinds = Array.make<["isSome", "isNone"]>("isSome", "isNone")

// OptionGuardKind exists because its fields form one stable data contract used by the linter.
export const OptionGuardKind = Schema.Literals(optionGuardKinds)

export type OptionGuardKind = typeof OptionGuardKind.Type
