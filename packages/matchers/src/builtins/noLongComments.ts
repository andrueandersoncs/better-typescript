import { Array, Schema } from "effect"
import { commentText } from "../sources/comments.js"
import { fileMatcher } from "../matcher/matcher.js"
import { makePositionMatch, type MatchContext } from "../matcher/data.js"

// NoLongCommentsFact is empty payload because guidance and matchers share identity.
export const NoLongCommentsFact = Schema.Struct({})

export interface NoLongCommentsFact extends Schema.Schema.Type<typeof NoLongCommentsFact> {}

// emptyNoLongCommentsFact is the shared empty fact because guidance and matchers share identity.
export const emptyNoLongCommentsFact = NoLongCommentsFact.make({})

const maximumCommentLength = 100

const longCommentsMatches = (context: MatchContext) => {
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()
  const comments = context.comments

  const isOverlongComment = (comment: (typeof comments)[number]) => {
    const length = commentText(text)(comment).length

    return length > maximumCommentLength
  }

  const overlong = Array.filter(comments, isOverlongComment)

  const matchOverlongComment = (comment: (typeof comments)[number]) => {
    const position = sourceFile.getLineAndCharacterOfPosition(comment.pos)

    return makePositionMatch(
      sourceFile,
      position.line + 1,
      position.character + 1,
      emptyNoLongCommentsFact
    )
  }

  return Array.map(overlong, matchOverlongComment)
}

export const noLongCommentsMatcher = fileMatcher(longCommentsMatches)
