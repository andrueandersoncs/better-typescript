import { Array, Option, pipe } from "effect"
import * as ts from "typescript"

declare const scores: ReadonlyArray<number>
declare const ranked: Array.NonEmptyReadonlyArray<number>
declare const flag: boolean

// Deriving new values never mutates. Array.replace/modify return Option.
export const raised: ReadonlyArray<number> = pipe(
  Array.replace(scores, 0, 100),
  Option.getOrElse(() => scores)
)

const doubleScore = (score: number): number => score * 2

export const doubled: ReadonlyArray<number> = pipe(
  Array.modify(scores, 0, doubleScore),
  Option.getOrElse(() => scores)
)

// Known head updates on nonempty arrays can use direct helpers instead of Option.
export const topScore = Array.setHeadNonEmpty(ranked, 100)

export const doubledTop = Array.modifyHeadNonEmpty(ranked, doubleScore)

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

// Nullability wrappers must not change third-party exemption.
declare const maybeRange: ts.TextRange | null

export const rewindMaybeRange = (): number | undefined =>
  maybeRange == null ? undefined : (maybeRange.pos = 0)
