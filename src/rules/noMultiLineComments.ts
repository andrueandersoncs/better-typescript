import { Array as Arr, Option, Schema, Struct } from "effect"
import * as ts from "typescript"
import { fileCheck } from "./ruleCheck.js"
import { Location, toRelativeFileName } from "../detectors/location.js"
import { Detection } from "../detectors/rule.js"
import type { RuleCheck, RuleContext } from "../detectors/rule.js"

const message = "Avoid multi-line comments."

const hint =
  "Code should be self-documenting. Use single-line comments only to explain WHY " +
  "something is done, never HOW. JSDoc (/** ... */) documenting an exported API is " +
  "permitted. For architectural decisions that require longer explanation, create an " +
  "Architectural Decision Record (ADR) as a markdown file in the adrs/ directory instead."

class ScannedToken extends Schema.Class<ScannedToken>("ScannedToken")({
  kind: Schema.Number,
  pos: Schema.Number
}) {}

// Array.unfold drives the stateful scanner with a bounded internal loop; recursion overflows large files.
const scanNextToken = (
  scanner: ts.Scanner
): Option.Option<readonly [ScannedToken, ts.Scanner]> => {
  const kind = scanner.scan()

  if (kind === ts.SyntaxKind.EndOfFileToken) {
    return Option.none()
  }

  const pos = scanner.getTokenStart()
  const token = new ScannedToken({ kind, pos })

  return Option.some([token, scanner])
}
type RunStartPosition = (
  current: ScannedToken,
  index: number
) => Option.Option<number>

// JSDoc (`/** ... */`) is API documentation surfaced by editors and doc tooling, not prose comments.
const isMultiLineBlock =
  (text: string) =>
  (token: ScannedToken): boolean => {
    const isBlock = token.kind === ts.SyntaxKind.MultiLineCommentTrivia
    const closeIndex = text.indexOf("*/", token.pos)
    const notFound = closeIndex === -1
    const end = notFound ? text.length : closeIndex + 2
    const commentText = text.slice(token.pos, end)
    const hasNewline = commentText.indexOf("\n") !== -1
    const isJsDoc = commentText.startsWith("/**")

    return [isBlock, hasNewline, !isJsDoc].every(Boolean)
  }

const isSingleLineComment = (token: ScannedToken): boolean =>
  token.kind === ts.SyntaxKind.SingleLineCommentTrivia

const tokenPos = Struct.get("pos")

const lineOf =
  (sourceFile: ts.SourceFile) =>
  (pos: number): number =>
    sourceFile.getLineAndCharacterOfPosition(pos).line

const isAdjacentLine =
  (sourceFile: ts.SourceFile) =>
  (a: ScannedToken) =>
  (b: ScannedToken): boolean =>
    lineOf(sourceFile)(b.pos) - lineOf(sourceFile)(a.pos) === 1

const runStartPosition =
  (sourceFile: ts.SourceFile) =>
  (singles: ReadonlyArray<ScannedToken>): RunStartPosition =>
  (current, index) => {
    const hasNextAdjacent =
      index < singles.length - 1 &&
      isAdjacentLine(sourceFile)(current)(singles[index + 1])

    if (index === 0) {
      return hasNextAdjacent ? Option.some(current.pos) : Option.none()
    }

    const previousToken = singles[index - 1]
    const isNotAdjacentToPrevious =
      !isAdjacentLine(sourceFile)(previousToken)(current)
    const previousIsNotSingleLine = !isSingleLineComment(previousToken)
    const isRunStart = isNotAdjacentToPrevious || previousIsNotSingleLine
    const shouldFlag = isRunStart && hasNextAdjacent

    return shouldFlag ? Option.some(current.pos) : Option.none()
  }

const positionToMatch =
  (sourceFile: ts.SourceFile) =>
  (fileName: string) =>
  (pos: number): Detection => {
    const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(pos)
    const location = new Location({
      path: fileName,
      line: lineAndCharacter.line + 1,
      column: lineAndCharacter.character + 1
    })

    return new Detection({ location, message, hint })
  }

// filterMap stays bounded by the comment array; per-comment recursion overflows large files.
const fileMatches = (context: RuleContext): ReadonlyArray<Detection> => {
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()
  const fileName = toRelativeFileName(context.projectRoot)(sourceFile.fileName)
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    text
  )
  const tokens = Arr.unfold(scanner, scanNextToken)
  const blockPositions = tokens.filter(isMultiLineBlock(text)).map(tokenPos)
  const singleLineTokens = tokens.filter(isSingleLineComment)
  const adjacentRunPositions = Arr.filterMap(
    singleLineTokens,
    runStartPosition(sourceFile)(singleLineTokens)
  )
  const positions = blockPositions.concat(adjacentRunPositions)

  return positions.map(positionToMatch(sourceFile)(fileName))
}

const check = fileCheck(fileMatches)

export const noMultiLineComments: RuleCheck = check
