import { Array } from "effect"
import * as ts from "typescript"

declare const scores: ReadonlyArray<number>
declare const flag: boolean

// Deriving new values never mutates.
export const raised = Array.replace(scores, 0, 100)

const doubleScore = (score: number): number => score * 2

export const doubled = Array.modify(scores, 0, doubleScore)

// Comparison and arithmetic binary operators are not assignments.
export const isHigh = scores.length > 3

export const total = scores.length + 1

// Unary operators that do not write to their operand.
export const negated = !flag

export const negative = -1

// Mutating a third-party object whose API contract requires it: a lib global.
export const renameErrors = (): string => (Error.prototype.name = "Failure")

// Mutating a third-party object reached through an import alias.
export const resetArgs = (): ReadonlyArray<string> => (ts.sys.args = [])
