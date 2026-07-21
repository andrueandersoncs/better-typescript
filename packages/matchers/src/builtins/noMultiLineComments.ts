import { Array, Function, Option, Predicate, Result, Struct, flow, Schema } from "effect"
import * as ts from "typescript"
import { onlyBlankBetween } from "../sources/comments.js"
import type { SourceComment } from "../sources/commentsData.js"
import { strictEqual } from "../equivalence.js"
import { fileMatcher } from "../matcher/matcher.js"
import { positionMatch, type MatchContext } from "../matcher/data.js"

// NoMultiLineCommentsFact is empty payload because guidance and matchers share identity.
export const NoMultiLineCommentsFact = Schema.Struct({})

export interface NoMultiLineCommentsFact extends Schema.Schema.Type<
  typeof NoMultiLineCommentsFact
> {}

// emptyNoMultiLineCommentsFact is empty payload because guidance and matchers share identity.
export const emptyNoMultiLineCommentsFact = NoMultiLineCommentsFact.make({})

const isSingleLineComment = flow(
  Struct.get<SourceComment, "kind">("kind"),
  strictEqual(ts.SyntaxKind.SingleLineCommentTrivia)
)

const commentPosition = Struct.get<{ readonly pos: number }, "pos">("pos")

const multiLineCommentsMatches = (context: MatchContext) => {
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()
  const comments = context.comments
  const blockComments = Array.filter(comments, Predicate.not(isSingleLineComment))
  const blockPositions = Array.map(blockComments, commentPosition)
  const singleLineComments = Array.filter(comments, isSingleLineComment)

  const stackedRunPosition = (current: SourceComment, index: number) => {
    const nextComment = Array.get(singleLineComments, index + 1)
    const previousComment = Array.get(singleLineComments, index - 1)
    const nextJoinsCurrent = onlyBlankBetween(text)(current)
    const previousJoinsCurrent = Function.flip(onlyBlankBetween(text))(current)
    const joinsNext = Option.exists(nextComment, nextJoinsCurrent)
    const joinsPrevious = Option.exists(previousComment, previousJoinsCurrent)
    const startsStack = !joinsPrevious
    const isStackHead = startsStack && joinsNext

    return isStackHead ? Result.succeed(current.pos) : Result.failVoid
  }

  const stackedRunPositions = Array.filterMap(singleLineComments, stackedRunPosition)
  const positions = Array.appendAll(blockPositions, stackedRunPositions)

  const matchCommentPosition = (pos: number) => {
    const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(pos)

    return positionMatch(
      sourceFile,
      lineAndCharacter.line + 1,
      lineAndCharacter.character + 1,
      emptyNoMultiLineCommentsFact
    )
  }

  return Array.map(positions, matchCommentPosition)
}

export const noMultiLineCommentsMatcher = fileMatcher(multiLineCommentsMatches)
