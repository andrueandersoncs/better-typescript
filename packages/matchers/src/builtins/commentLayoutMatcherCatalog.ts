import { noBlankLinesBetweenSingleLineDeclarationsMatcher } from "./noBlankLinesBetweenSingleLineDeclarations.js"
import { noLongCommentsMatcher } from "./noLongComments.js"
import { noMultiLineCommentsMatcher } from "./noMultiLineComments.js"
import { requireBecauseInCommentsMatcher } from "./requireBecauseInComments.js"
import { requireBlankLinesAroundMultilineDeclarationsMatcher } from "./requireBlankLinesAroundMultilineDeclarations.js"

export const commentLayoutMatcherCatalog = {
  noMultiLineCommentsMatcher,
  requireBecauseInCommentsMatcher,
  noLongCommentsMatcher,
  requireBlankLinesAroundMultilineDeclarationsMatcher,
  noBlankLinesBetweenSingleLineDeclarationsMatcher
} as const
