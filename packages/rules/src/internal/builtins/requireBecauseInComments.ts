import { Array, Schema } from "effect"
import { commentText } from "../sources/commentText.js"
import { fileScanner } from "../scanner/fileScanner.js"
import { makePositionMatch } from "../scanner/makePositionMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"

// RequireBecauseInCommentsFact exists because its fields form one stable data contract used by the linter.
export const RequireBecauseInCommentsFact = Schema.Struct({})

export interface RequireBecauseInCommentsFact extends Schema.Schema.Type<
  typeof RequireBecauseInCommentsFact
> {}

// emptyRequireBecauseInCommentsFact exists because its fields form one stable data contract used by the linter.
export const emptyRequireBecauseInCommentsFact = RequireBecauseInCommentsFact.make({})

const becauseWord = /(?<![\p{L}\p{M}\p{N}\p{Pc}])because(?![\p{L}\p{M}\p{N}\p{Pc}])/iu

const becauseInCommentsMatches = (context: MatchContext) => {
  const text = context.sourceFile.getFullText()

  const isMissingBecause = (comment: (typeof context.comments)[number]) => {
    const textOfComment = commentText(text)(comment)

    return !becauseWord.test(textOfComment)
  }

  const missingBecause = Array.filter(context.comments, isMissingBecause)

  const matchMissingBecause = (comment: (typeof context.comments)[number]) => {
    const position = context.sourceFile.getLineAndCharacterOfPosition(comment.pos)

    return makePositionMatch(emptyRequireBecauseInCommentsFact)(position.line + 1)(
      position.character + 1
    )(context.sourceFile)
  }

  return Array.map(missingBecause, matchMissingBecause)
}

export const requireBecauseInCommentsScanner = fileScanner(becauseInCommentsMatches)
