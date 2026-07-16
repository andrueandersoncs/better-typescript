import { Array } from "effect"
import { fileCheck } from "@better-typescript/core/engine/check"
import { Detection } from "@better-typescript/core/engine/location/data"
import { Location } from "@better-typescript/core/engine/location/data"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { commentText, sourceComments } from "./support/comments.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
const maximumCommentLength = 100

const message = "Comments must be at most 100 characters."

const hint =
  "Keep each comment within 100 characters because longer comments stop reading as code " +
  "annotations. State the single load-bearing reason; move longer explanations into an " +
  "Architectural Decision Record (ADR) in the adrs/ directory instead."

const overlongComments = (context: CheckContext): ReadonlyArray<Detection> => {
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()
  const fileName = toRelativeFileName(context.projectRoot)(sourceFile.fileName)
  const comments = sourceComments(sourceFile)

  const overlong = Array.filter(comments, (comment) => {
    const length = commentText(text)(comment).length

    return length > maximumCommentLength
  })

  return Array.map(overlong, (comment) => {
    const position = sourceFile.getLineAndCharacterOfPosition(comment.pos)

    const location = new Location({
      path: fileName,
      line: position.line + 1,
      column: position.character + 1
    })

    return new Detection({ location, message, hint })
  })
}

export const noLongComments: Check = fileCheck(overlongComments)

export const noLongCommentsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-long-comments")
