import { preferInferredTypesScanner } from "./preferInferredTypes.js"

import { Function } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const preferInferredTypeMessages = {
  const: "Avoid a const annotation when its initializer infers the same type.",
  return: "Avoid a return annotation when the function body infers the same type.",
  contextual: "Avoid annotations on a contextually typed function."
} as const

const preferInferredTypeHints = {
  const:
    "Delete the type annotation. Keep annotations that widen a value or guide generic inference.",
  return:
    "Delete the return type annotation. Keep explicit contracts when inference changes the signature.",
  contextual:
    "Delete the parameter and return annotations together; the surrounding expression supplies them."
} as const

const makePreferInferredTypes = () => {
  const makePreferInferredTypesFindings = (
    match: Match<typeof preferInferredTypesScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const message = preferInferredTypeMessages[match.fact.kind]
    const hint = preferInferredTypeHints[match.fact.kind]

    return makeRuleMessage(message, hint)
  }

  const preferInferredTypes = makeRule("prefer-inferred-types")(preferInferredTypesScanner)(
    Function.constant(makePreferInferredTypesFindings)
  )

  return preferInferredTypes
}

export const preferInferredTypes = makePreferInferredTypes()
