import { Array, Function, Option, Predicate, Result, Struct, flow, Schema } from "effect"
import * as ts from "typescript"
import type { SourceComment } from "../sources/commentsData.js"
import { strictEqual } from "../equivalence.js"
import { fileMatcher } from "../matcher/fileMatcher.js"
import { makePositionMatch } from "../matcher/makePositionMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"

// NoMultiLineCommentsFact is empty payload because guidance and matchers share identity.
export const NoMultiLineCommentsFact = Schema.Struct({})

export interface NoMultiLineCommentsFact extends Schema.Schema.Type<
  typeof NoMultiLineCommentsFact
> {}

// emptyNoMultiLineCommentsFact is empty payload because guidance and matchers share identity.
export const emptyNoMultiLineCommentsFact = NoMultiLineCommentsFact.make({})

const onlyBlankBetween = (text: string) => (a: SourceComment) => (b: SourceComment) => {
  const between = text.slice(a.end, b.pos)
  const trimmed = between.trim()

  return strictEqual(0)(trimmed.length)
}

const isSingleLineComment = flow(
  Struct.get<SourceComment, "kind">("kind"),
  strictEqual(ts.SyntaxKind.SingleLineCommentTrivia)
)

const commentPosition = Struct.get<{ readonly pos: number }, "pos">("pos")

const multiLineCommentsMatches = (context: MatchContext) => {
  const text = context.sourceFile.getFullText()
  const blockComments = Array.filter(context.comments, Predicate.not(isSingleLineComment))
  const blockPositions = Array.map(blockComments, commentPosition)
  const singleLineComments = Array.filter(context.comments, isSingleLineComment)

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
    const lineAndCharacter = context.sourceFile.getLineAndCharacterOfPosition(pos)

    return makePositionMatch(
      context.sourceFile,
      lineAndCharacter.line + 1,
      lineAndCharacter.character + 1,
      emptyNoMultiLineCommentsFact
    )
  }

  return Array.map(positions, matchCommentPosition)
}

export const noMultiLineCommentsMatcher = fileMatcher(multiLineCommentsMatches)
