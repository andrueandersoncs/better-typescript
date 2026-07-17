import { Array } from "effect"
import { noMultiLineComments } from "../checks/noMultiLineComments.js"
import { requireBecauseInComments } from "../checks/requireBecauseInComments.js"
import { noLongComments } from "../checks/noLongComments.js"
import { preferInferredTypes } from "../checks/preferInferredTypes.js"
import { requireBlankLinesAroundMultilineDeclarations } from "../checks/requireBlankLinesAroundMultilineDeclarations.js"
import { noBlankLinesBetweenSingleLineDeclarations } from "../checks/noBlankLinesBetweenSingleLineDeclarations.js"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"

// Member order is pinned because concatenated categories define the public report block order.
export const commentAndDeclarationChecks: ReadonlyArray<NamedCheck> = Array.make(
  noMultiLineComments,
  requireBecauseInComments,
  noLongComments,
  preferInferredTypes,
  requireBlankLinesAroundMultilineDeclarations,
  noBlankLinesBetweenSingleLineDeclarations
)
