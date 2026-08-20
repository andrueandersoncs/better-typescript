import { Equivalence } from "effect"

declare const left: string
declare const right: string

const strictStringEqual = Equivalence.strictEqual<string>()

export const strict = left === right // ~detect 23
export const loose = left == right
export const strictInequality = left !== right
export const equivalent = strictStringEqual(left, right)
