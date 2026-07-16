import { Array } from "effect"
import { defineFileCheck } from "../defineCheck.js"
import { Detection } from "@better-typescript/core/engine/location/data"
import { Location } from "@better-typescript/core/engine/location/data"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { commentText, sourceComments } from "./support/comments.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"

const message = 'Comments must include the word "because".'

const hint =
  "Delete comments that only restate what the code does. Otherwise, explain why the " +
  'code or approach is necessary using the word "because". Every comment carries this ' +
  "obligation; there are no exempt comment forms."

const becauseWord = /(?<![\p{L}\p{M}\p{N}\p{Pc}])because(?![\p{L}\p{M}\p{N}\p{Pc}])/iu

const commentsWithoutBecause = (context: CheckContext): ReadonlyArray<Detection> => {
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()
  const fileName = toRelativeFileName(context.projectRoot)(sourceFile.fileName)
  const comments = sourceComments(sourceFile)

  const missingBecause = Array.filter(comments, (comment) => {
    const textOfComment = commentText(text)(comment)

    return !becauseWord.test(textOfComment)
  })

  return Array.map(missingBecause, (comment) => {
    const position = sourceFile.getLineAndCharacterOfPosition(comment.pos)

    const location = new Location({
      path: fileName,
      line: position.line + 1,
      column: position.character + 1
    })

    return new Detection({ location, message, hint })
  })
}

export const requireBecauseInComments = defineFileCheck(
  "require-because-in-comments",
  commentsWithoutBecause
)
