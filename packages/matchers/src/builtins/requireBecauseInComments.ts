import { Array, Schema } from "effect"
import { commentText } from "../sources/comments.js"
import { fileMatcher } from "../matcher/matcher.js"
import { makePositionMatch, type MatchContext } from "../matcher/data.js"

// RequireBecauseInCommentsFact is empty payload because guidance and matchers share identity.
export const RequireBecauseInCommentsFact = Schema.Struct({})

export interface RequireBecauseInCommentsFact extends Schema.Schema.Type<
  typeof RequireBecauseInCommentsFact
> {}

// emptyRequireBecauseInCommentsFact is empty payload because guidance and matchers share identity.
export const emptyRequireBecauseInCommentsFact = RequireBecauseInCommentsFact.make({})

const becauseWord = /(?<![\p{L}\p{M}\p{N}\p{Pc}])because(?![\p{L}\p{M}\p{N}\p{Pc}])/iu

const becauseInCommentsMatches = (context: MatchContext) => {
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()
  const comments = context.comments

  const isMissingBecause = (comment: (typeof comments)[number]) => {
    const textOfComment = commentText(text)(comment)

    return !becauseWord.test(textOfComment)
  }

  const missingBecause = Array.filter(comments, isMissingBecause)

  const matchMissingBecause = (comment: (typeof comments)[number]) => {
    const position = sourceFile.getLineAndCharacterOfPosition(comment.pos)

    return makePositionMatch(
      sourceFile,
      position.line + 1,
      position.character + 1,
      emptyRequireBecauseInCommentsFact
    )
  }

  return Array.map(missingBecause, matchMissingBecause)
}

export const requireBecauseInCommentsMatcher = fileMatcher(becauseInCommentsMatches)
