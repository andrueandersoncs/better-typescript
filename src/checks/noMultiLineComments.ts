import { Array as Arr, Option, Struct } from "effect"
import * as ts from "typescript"
import { fileCheck } from "../engine/check.js"
import { Detection } from "../engine/location.js"
import { Location, toRelativeFileName } from "../engine/location.js"
import {
  commentText,
  isJsDocComment,
  sourceComments,
  type SourceComment
} from "./support/comments.js"
import type { Check, CheckContext } from "../engine/check.js"

const message = "Avoid multi-line comments."

const hint =
  "Code should be self-documenting. Use single-line comments only to explain WHY " +
  "something is done, never HOW. JSDoc (/** ... */) documenting an exported API is " +
  "permitted. For architectural decisions that require longer explanation, create an " +
  "Architectural Decision Record (ADR) as a markdown file in the adrs/ directory instead."

type RunStartPosition = (
  current: SourceComment,
  index: number
) => Option.Option<number>

const isMultiLineBlock =
  (text: string) =>
  (comment: SourceComment): boolean => {
    const isBlock = comment.kind === ts.SyntaxKind.MultiLineCommentTrivia
    const hasNewline = commentText(text)(comment).includes("\n")
    const isJsDoc = isJsDocComment(text)(comment)

    return [isBlock, hasNewline, !isJsDoc].every(Boolean)
  }

const isSingleLineComment = (comment: SourceComment): boolean =>
  comment.kind === ts.SyntaxKind.SingleLineCommentTrivia

const commentPosition = Struct.get("pos")

const lineOf =
  (sourceFile: ts.SourceFile) =>
  (pos: number): number =>
    sourceFile.getLineAndCharacterOfPosition(pos).line

const isAdjacentLine =
  (sourceFile: ts.SourceFile) =>
  (a: SourceComment) =>
  (b: SourceComment): boolean =>
    lineOf(sourceFile)(b.pos) - lineOf(sourceFile)(a.pos) === 1

const runStartPosition =
  (sourceFile: ts.SourceFile) =>
  (singles: ReadonlyArray<SourceComment>): RunStartPosition =>
  (current, index) => {
    const hasNextAdjacent =
      index < singles.length - 1 &&
      isAdjacentLine(sourceFile)(current)(singles[index + 1])

    if (index === 0) {
      return hasNextAdjacent ? Option.some(current.pos) : Option.none()
    }

    const previousComment = singles[index - 1]
    const isNotAdjacentToPrevious =
      !isAdjacentLine(sourceFile)(previousComment)(current)
    const previousIsNotSingleLine = !isSingleLineComment(previousComment)
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

const fileMatches = (context: CheckContext): ReadonlyArray<Detection> => {
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()
  const fileName = toRelativeFileName(context.projectRoot)(sourceFile.fileName)
  const comments = sourceComments(sourceFile)
  const blockPositions = comments
    .filter(isMultiLineBlock(text))
    .map(commentPosition)
  const singleLineComments = comments.filter(isSingleLineComment)
  const adjacentRunPositions = Arr.filterMap(
    singleLineComments,
    runStartPosition(sourceFile)(singleLineComments)
  )
  const positions = blockPositions.concat(adjacentRunPositions)

  return positions.map(positionToMatch(sourceFile)(fileName))
}

export const noMultiLineComments: Check = fileCheck(fileMatches)
