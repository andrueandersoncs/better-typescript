import { Array, Schema } from "effect"

const optionGuardKinds = Array.make<["isSome", "isNone"]>("isSome", "isNone")

// OptionGuardKind classifies Option guards because isSome and isNone advice differ.
export const OptionGuardKind = Schema.Literals(optionGuardKinds)

export type OptionGuardKind = typeof OptionGuardKind.Type
