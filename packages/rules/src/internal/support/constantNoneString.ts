import { Function } from "effect"
import { noneString } from "./noneString.js"

export const constantNoneString = Function.constant(noneString)
