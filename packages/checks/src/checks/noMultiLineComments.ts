import { Array, Option, Struct } from "effect"
import * as ts from "typescript"
import { fileCheck } from "@better-typescript/core/engine/check"
import { Detection } from "@better-typescript/core/engine/location/data"
import { Location } from "@better-typescript/core/engine/location/data"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import {
  commentText,
  isJsDocComment,
  sourceComments,
  type SourceComment
} from "./support/comments.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
const message = "Avoid multi-line comments."

const hint =
  "Code should be self-documenting. Use single-line comments only to explain WHY " +
  "something is done, never HOW. JSDoc (/** ... */) documenting an exported API is " +
  "permitted. For architectural decisions that require longer explanation, create an " +
  "Architectural Decision Record (ADR) as a markdown file in the adrs/ directory instead."

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

const fileMatches = (context: CheckContext): ReadonlyArray<Detection> => {
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()
  const fileName = toRelativeFileName(context.projectRoot)(sourceFile.fileName)
  const comments = sourceComments(sourceFile)

  const blockComments = Array.filter(comments, (comment) => {
    const isBlock = comment.kind === ts.SyntaxKind.MultiLineCommentTrivia
    const hasNewline = commentText(text)(comment).includes("\n")
    const isJsDoc = isJsDocComment(text)(comment)

    const jsDocConditions = Array.make(isBlock, hasNewline, !isJsDoc)
    return Array.every(jsDocConditions, Boolean)
  })

  const blockPositions = Array.map(blockComments, commentPosition)
  const singleLineComments = Array.filter(comments, isSingleLineComment)

  const adjacentRunPositions = Array.filterMap(
    singleLineComments,
    (current, index) => {
      const hasNextAdjacent =
        index < singleLineComments.length - 1 &&
        isAdjacentLine(sourceFile)(current)(singleLineComments[index + 1])

      if (index === 0) {
        return hasNextAdjacent ? Option.some(current.pos) : Option.none()
      }

      const previousComment = singleLineComments[index - 1]

      const isNotAdjacentToPrevious =
        !isAdjacentLine(sourceFile)(previousComment)(current)

      const previousIsNotSingleLine = !isSingleLineComment(previousComment)
      const isRunStart = isNotAdjacentToPrevious || previousIsNotSingleLine
      const shouldFlag = isRunStart && hasNextAdjacent

      return shouldFlag ? Option.some(current.pos) : Option.none()
    }
  )

  const positions = Array.appendAll(blockPositions, adjacentRunPositions)

  return Array.map(positions, (pos) => {
    const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(pos)

    const location = new Location({
      path: fileName,
      line: lineAndCharacter.line + 1,
      column: lineAndCharacter.character + 1
    })

    return new Detection({ location, message, hint })
  })
}

export const noMultiLineComments: Check = fileCheck(fileMatches)

export const noMultiLineCommentsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-multi-line-comments")
