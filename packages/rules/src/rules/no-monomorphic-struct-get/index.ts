import { noMonomorphicStructGetScanner } from "./noMonomorphicStructGet.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoMonomorphicStructGet = () => {
  const message = "Avoid monomorphizing Struct.get at its declaration."

  const hint =
    "Keep Struct.get polymorphic. Inline it at a typed consumer, or put the " +
    "domain type on the consuming value or result rather than on the getter."

  const noMonomorphicStructGet = makeRule("no-monomorphic-struct-get")(
    noMonomorphicStructGetScanner
  )(fixedRuleMessage(message, hint))

  return noMonomorphicStructGet
}

export const noMonomorphicStructGet = makeNoMonomorphicStructGet()
