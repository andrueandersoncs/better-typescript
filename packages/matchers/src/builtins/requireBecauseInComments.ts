import { Array, Schema } from "effect"
import { commentText } from "../sources/commentText.js"
import { fileMatcher } from "../matcher/fileMatcher.js"
import { makePositionMatch } from "../matcher/makePositionMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"

// RequireBecauseInCommentsFact is empty payload because guidance and matchers share identity.
export const RequireBecauseInCommentsFact = Schema.Struct({})

export interface RequireBecauseInCommentsFact extends Schema.Schema.Type<
  typeof RequireBecauseInCommentsFact
> {}

// emptyRequireBecauseInCommentsFact is empty payload because guidance and matchers share identity.
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

    return makePositionMatch(
      context.sourceFile,
      position.line + 1,
      position.character + 1,
      emptyRequireBecauseInCommentsFact
    )
  }

  return Array.map(missingBecause, matchMissingBecause)
}

export const requireBecauseInCommentsMatcher = fileMatcher(becauseInCommentsMatches)
