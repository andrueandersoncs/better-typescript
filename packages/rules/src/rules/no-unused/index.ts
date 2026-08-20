import { noUnusedScanner } from "./noUnused.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoUnused = () => {
  const message = "Avoid unused imports, declarations, and parameters."

  const hint =
    "Delete the unused import, variable, function, type, or parameter. " +
    "If a parameter is required by a signature but intentionally unused, prefix its name with an underscore."

  const noUnused = makeRule("no-unused")(noUnusedScanner)(fixedRuleMessage(message, hint))

  return noUnused
}

export const noUnused = makeNoUnused()
