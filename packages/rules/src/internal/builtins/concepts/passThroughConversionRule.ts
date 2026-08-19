import { Array, Function, Struct, Tuple, flow, pipe } from "effect"
import { strictEqual } from "../../equivalence.js"
import { makeRule } from "../../rule/makeRule.js"
import { makeRuleMessage } from "../../rule/makeRuleMessage.js"
import type { RuleMessage } from "../../rule/ruleMessage.js"
import type { Match } from "../../scanner/match.js"
import { makeNodeMatch } from "../../scanner/makeNodeMatch.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import type { Scanner } from "../../scanner/scannerData.js"
import { makeConceptQueryScanner } from "./conceptQueryScanner.js"
import type { ConceptQuery } from "./conceptQueryScanner.js"
import type { PassThroughConversion } from "./passThroughConversion.js"

const conversionIsInContext = (context: MatchContext) => {
  const node = Struct.get<PassThroughConversion, "node">("node")
  const sourceFile = flow(node, (value) => value.getSourceFile())

  return flow(sourceFile, strictEqual(context.sourceFile))
}

const passThroughConversionQuery: ConceptQuery<readonly [string, string, string]> =
  (index) => (context) => {
    const makeMatch = (conversion: PassThroughConversion) => {
      const fact = Tuple.make(
        conversion.functionEntry.name,
        conversion.source.name,
        conversion.target.name
      )

      return makeNodeMatch(conversion.node, fact)
    }

    return pipe(
      index.passThroughConversions,
      Array.filter(conversionIsInContext(context)),
      Array.map(makeMatch)
    )
  }

export const passThroughConversionScanner = makeConceptQueryScanner(passThroughConversionQuery)

const makeMessageForPassThroughConversion = (
  match: Match<typeof passThroughConversionScanner extends Scanner<infer Fact> ? Fact : never>
) => {
  const functionName = Tuple.get(match.fact, 0)
  const sourceName = Tuple.get(match.fact, 1)
  const targetName = Tuple.get(match.fact, 2)

  return makeRuleMessage(
    `${functionName} copies ${sourceName} into ${targetName} without transformation.`,
    "Collapse the parallel representations or document and preserve the real boundary that requires both. A field-for-field adapter is evidence against introducing another first-party concept."
  )
}

const passThroughConversionMessage: RuleMessage<
  typeof passThroughConversionScanner extends Scanner<infer Fact> ? Fact : never
> = Function.constant(makeMessageForPassThroughConversion)

export const passThroughConversion = makeRule("pass-through-conversion")(
  passThroughConversionScanner
)(passThroughConversionMessage)
