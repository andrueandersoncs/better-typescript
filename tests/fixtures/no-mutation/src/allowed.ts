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

// A host-environment handler slot (lib.dom): assignment is the API contract.
declare const socket: WebSocket

socket.onmessage = null

// A third-party object reached through an import alias.
export const resetArgs = (): ReadonlyArray<string> => (ts.sys.args = [])

// A third-party-produced value held in a first-party binding: the data structure
// is still the package's, so its mutable fields follow the package's contract.
declare const range: ts.TextRange

export const rewindRange = (): number => (range.pos = 0)
