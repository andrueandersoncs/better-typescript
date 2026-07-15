import { Array } from "effect"
import { fileCheck } from "@better-typescript/core/engine/check"
import { Detection } from "@better-typescript/core/engine/location/data"
import { Location } from "@better-typescript/core/engine/location/data"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { commentText, isJsDocComment, sourceComments } from "./support/comments.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
const message = 'Comments must include the word "because".'

const hint =
  "Delete comments that only restate what the code does. Otherwise, explain why the " +
  'code or approach is necessary using the word "because". Structured JSDoc on an ' +
  "exported API (description plus at least one tag) is exempt because it documents an " +
  "API contract."

const becauseWord = /(?<![\p{L}\p{M}\p{N}\p{Pc}])because(?![\p{L}\p{M}\p{N}\p{Pc}])/iu

const commentsWithoutBecause = (context: CheckContext): ReadonlyArray<Detection> => {
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()
  const fileName = toRelativeFileName(context.projectRoot)(sourceFile.fileName)
  const comments = sourceComments(sourceFile)
  const isJsDoc = isJsDocComment(sourceFile)

  const missingBecause = Array.filter(comments, (comment) => {
    const isDocumentingJsDoc = isJsDoc(comment)
    const textOfComment = commentText(text)(comment)
    const hasBecause = becauseWord.test(textOfComment)
    const isNotJsDoc = !isDocumentingJsDoc
    const isMissingBecause = !hasBecause
    const jsDocConditions = Array.make(isNotJsDoc, isMissingBecause)
    return Array.every(jsDocConditions, Boolean)
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

export const requireBecauseInComments: Check = fileCheck(commentsWithoutBecause)

export const requireBecauseInCommentsExamples: NonEmptyRefactorExamples = fixtureRefactorExamples(
  "require-because-in-comments"
)
