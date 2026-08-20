import { noReexportsScanner } from "./noReexports.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoReexports = () => {
  const message = "Do not re-export imported bindings."

  const hint =
    "Import the dependency where it is used and expose a locally defined public interface instead."

  const noReexports = makeRule("no-reexports")(noReexportsScanner)(fixedRuleMessage(message, hint))

  return noReexports
}

export const noReexports = makeNoReexports()
