import { emptyStrings } from "./emptyStrings.js"
import { Function } from "effect"

export const constantEmptyStrings = Function.constant(emptyStrings)
