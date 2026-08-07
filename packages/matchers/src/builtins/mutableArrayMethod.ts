import { Schema } from "effect"
import { mutableArrayMethodNames } from "./mutableArrayMethodNames.js"

// MutableArrayMethod names mutating Array methods because remediation quotes the method.
export const MutableArrayMethod = Schema.Literals(mutableArrayMethodNames)

export type MutableArrayMethod = typeof MutableArrayMethod.Type
