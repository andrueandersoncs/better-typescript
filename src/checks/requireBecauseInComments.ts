import * as ts from "typescript"
import { fileCheck } from "../engine/check.js"
import { Detection } from "../engine/check.js"
import { Location, toRelativeFileName } from "../engine/location.js"
import {
  commentText,
  isJsDocComment,
  sourceComments,
  type SourceComment
} from "./support/comments.js"
import type { Check, CheckContext } from "../engine/check.js"

const message = 'Comments must include the word "because".'

const hint =
  "Delete comments that only restate what the code does. Otherwise, explain why the " +
  'code or approach is necessary using the word "because". JSDoc is exempt because it ' +
  "documents an API contract."

const becauseWord =
  /(?<![\p{L}\p{M}\p{N}\p{Pc}])because(?![\p{L}\p{M}\p{N}\p{Pc}])/iu

const lacksBecause =
  (text: string) =>
  (comment: SourceComment): boolean => {
    const isJsDoc = isJsDocComment(text)(comment)
    const textOfComment = commentText(text)(comment)
    const hasBecause = becauseWord.test(textOfComment)
    const isNotJsDoc = !isJsDoc
    const isMissingBecause = !hasBecause

    return [isNotJsDoc, isMissingBecause].every(Boolean)
  }

const detectionAtComment =
  (sourceFile: ts.SourceFile) =>
  (fileName: string) =>
  (comment: SourceComment): Detection => {
    const position = sourceFile.getLineAndCharacterOfPosition(comment.pos)
    const location = new Location({
      path: fileName,
      line: position.line + 1,
      column: position.character + 1
    })

    return new Detection({ location, message, hint })
  }

const commentsWithoutBecause = (
  context: CheckContext
): ReadonlyArray<Detection> => {
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()
  const fileName = toRelativeFileName(context.projectRoot)(sourceFile.fileName)
  const comments = sourceComments(sourceFile)
  const missingBecause = comments.filter(lacksBecause(text))

  return missingBecause.map(detectionAtComment(sourceFile)(fileName))
}

export const requireBecauseInComments: Check = fileCheck(commentsWithoutBecause)
