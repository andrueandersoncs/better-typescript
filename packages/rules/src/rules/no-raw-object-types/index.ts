import { noRawObjectTypesScanner } from "./noRawObjectTypes.js"

import { Function, pipe, Match as EffectMatch } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeNoRawObjectTypes = () => {
  const parameterMessage = "Parameter uses an anonymous object type instead of a named type."

  const parameterHint =
    "Reuse a named data structure that already expresses this value's semantics. " +
    "If none exists, reconsider whether this function is a real abstraction or a " +
    "procedural seam that should be collapsed into its owner. Introduce a new model " +
    "only when the data has meaning independent of this parameter list; never replace " +
    "it with another anonymous object type."

  const returnMessage = "Return type uses an anonymous object type instead of a named type."

  const returnHint =
    "Define a named type or interface that describes the data's domain meaning — " +
    "for example UserProfile instead of { name: string, age: number }. " +
    "Name the type after what the data represents, not its structural role " +
    "(avoid names like FooResult or BarResponse)."

  const makeNoRawObjectTypesFindings = (
    match: Match<typeof noRawObjectTypesScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const makeParameterFindings = () => makeRuleMessage(parameterMessage, parameterHint)
    const makeReturnFindings = () => makeRuleMessage(returnMessage, returnHint)

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "parameter" }, makeParameterFindings),
      EffectMatch.when({ kind: "return" }, makeReturnFindings),
      EffectMatch.exhaustive
    )
  }

  const noRawObjectTypes = makeRule("no-raw-object-types")(noRawObjectTypesScanner)(
    Function.constant(makeNoRawObjectTypesFindings)
  )

  return noRawObjectTypes
}

export const noRawObjectTypes = makeNoRawObjectTypes()
