import { deltaValue } from "./delta.js"
import { epsilonValue } from "./epsilon.js"
import { zetaValue } from "./zeta.js"

export const writeBack = (): string => deltaValue + epsilonValue
export const writeTail = (): string => zetaValue.toUpperCase()
export const summarizeBack = (): string => writeBack() + writeTail()
