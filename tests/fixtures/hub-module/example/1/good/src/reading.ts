import { alphaValue } from "./alpha.js"
import { betaValue } from "./beta.js"
import { gammaValue } from "./gamma.js"

export const readFront = (): string => alphaValue + betaValue
export const readMid = (): string => gammaValue.toUpperCase()
export const summarizeFront = (): string => readFront() + readMid()
