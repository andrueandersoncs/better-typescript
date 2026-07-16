import { Array, Result, Struct } from "effect"
import { defineFileCheck } from "../defineCheck.js"
import { Detection } from "@better-typescript/core/engine/location/data"
import { Location } from "@better-typescript/core/engine/location/data"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { isSingleLineComment, onlyBlankBetween, sourceComments } from "./support/comments.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"

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
  const comments = sourceComments(sourceFile)
  const blockComments = Array.filter(comments, (comment) => !isSingleLineComment(comment))
  const blockPositions = Array.map(blockComments, commentPosition)
  const singleLineComments = Array.filter(comments, isSingleLineComment)

  const stackedRunPositions = Array.filterMap(singleLineComments, (current, index) => {
    const joinsNext =
      index < singleLineComments.length - 1 &&
      onlyBlankBetween(text)(current)(singleLineComments[index + 1])

    const joinsPrevious =
      index > 0 && onlyBlankBetween(text)(singleLineComments[index - 1])(current)

    const startsStack = !joinsPrevious
    const isStackHead = startsStack && joinsNext

    return isStackHead ? Result.succeed(current.pos) : Result.failVoid
  })

  const positions = Array.appendAll(blockPositions, stackedRunPositions)

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

export const noMultiLineComments = defineFileCheck("no-multi-line-comments", fileMatches)
