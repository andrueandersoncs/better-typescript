import { requireBecauseInCommentsScanner } from "./requireBecauseInComments.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeRequireBecauseInComments = () => {
  const message = 'Comments must explain why using the word "because".'
  const hint = "Delete the comment if it does not explain a reason."

  const requireBecauseInComments = makeRule("require-because-in-comments")(
    requireBecauseInCommentsScanner
  )(fixedRuleMessage(message, hint))

  return requireBecauseInComments
}

export const requireBecauseInComments = makeRequireBecauseInComments()
