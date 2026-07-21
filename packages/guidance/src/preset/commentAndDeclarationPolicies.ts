import { Array } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/data"
import { noMultiLineComments } from "../policies/noMultiLineComments.js"
import { requireBecauseInComments } from "../policies/requireBecauseInComments.js"
import { noLongComments } from "../policies/noLongComments.js"
import { preferInferredTypes } from "../policies/preferInferredTypes.js"
import { requireBlankLinesAroundMultilineDeclarations } from "../policies/requireBlankLinesAroundMultilineDeclarations.js"
import { noBlankLinesBetweenSingleLineDeclarations } from "../policies/noBlankLinesBetweenSingleLineDeclarations.js"

// Member order is pinned because concatenated categories define the public report block order.
export const commentAndDeclarationPolicies: ReadonlyArray<Policy> = Array.make(
  noMultiLineComments,
  requireBecauseInComments,
  noLongComments,
  preferInferredTypes,
  requireBlankLinesAroundMultilineDeclarations,
  noBlankLinesBetweenSingleLineDeclarations
)
