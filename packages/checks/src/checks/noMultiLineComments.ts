import { Array, Function, Option, Predicate, Result, Struct } from "effect"
import * as ts from "typescript"
import { makeFileCheck } from "../defineCheck.js"
import { Detection } from "@better-typescript/core/engine/location/data"
import { Location } from "@better-typescript/core/engine/location/data"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { onlyBlankBetween } from "@better-typescript/core/engine/sources/comments"
import type { SourceComment } from "@better-typescript/core/engine/sources/comments/data"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const isSingleLineComment = (comment: SourceComment) =>
  strictEqual(comment.kind, ts.SyntaxKind.SingleLineCommentTrivia)

const message = "Avoid multi-line comments."

const hint =
  "Code should be self-documenting. Use isolated single-line comments only to explain WHY " +
  "something is done, never HOW. Block comments and JSDoc (/* ... */ and /** ... */) are " +
  "disallowed entirely. Consecutive single-line comments form a multi-line comment even when " +
  "blank lines separate them, so keep one comment per explanation. For architectural decisions " +
  "that require longer explanation, create an Architectural Decision Record (ADR) as a " +
  "markdown file in the adrs/ directory instead."

const commentPosition = Struct.get<{ readonly pos: number }, "pos">("pos")

const fileMatches = (context: CheckContext): ReadonlyArray<Detection> => {
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()
  const fileName = toRelativeFileName(context.projectRoot)(sourceFile.fileName)
  const comments = context.comments
  const blockComments = Array.filter(comments, Predicate.not(isSingleLineComment))
  const blockPositions = Array.map(blockComments, commentPosition)
  const singleLineComments = Array.filter(comments, isSingleLineComment)

  const stackedRunPositions = Array.filterMap(singleLineComments, (current, index) => {
    const nextComment = Array.get(singleLineComments, index + 1)
    const previousComment = Array.get(singleLineComments, index - 1)
    const nextJoinsCurrent = onlyBlankBetween(text)(current)
    const previousJoinsCurrent = Function.flip(onlyBlankBetween(text))(current)
    const joinsNext = Option.exists(nextComment, nextJoinsCurrent)
    const joinsPrevious = Option.exists(previousComment, previousJoinsCurrent)
    const startsStack = !joinsPrevious
    const isStackHead = startsStack && joinsNext

    return isStackHead ? Result.succeed(current.pos) : Result.failVoid
  })

  const positions = Array.appendAll(blockPositions, stackedRunPositions)

  return Array.map(positions, (pos) => {
    const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(pos)

    const location = Location.make({
      path: fileName,
      line: lineAndCharacter.line + 1,
      column: lineAndCharacter.character + 1
    })

    return Detection.make({ location, message, hint })
  })
}

export const noMultiLineComments = makeFileCheck("no-multi-line-comments", fileMatches)
