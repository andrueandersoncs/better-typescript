import { Array, Function, HashSet, Struct, Tuple, flow, pipe } from "effect"
import { strictEqual } from "../../equivalence.js"
import { makeRule } from "../../rule/makeRule.js"
import { makeRuleMessage } from "../../rule/makeRuleMessage.js"
import type { RuleMessage } from "../../rule/ruleMessage.js"
import type { Match } from "../../scanner/match.js"
import { makeNodeMatch } from "../../scanner/makeNodeMatch.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import type { Scanner } from "../../scanner/scannerData.js"
import type { ConceptIndex } from "./conceptIndex.js"
import { rolesFor } from "./conceptIndexQueries.js"
import { makeConceptQueryScanner } from "./conceptQueryScanner.js"
import type { ConceptQuery } from "./conceptQueryScanner.js"
import type { ParameterBag } from "./parameterBag.js"

const bagIsInContext = (context: MatchContext) => {
  const node = Struct.get<ParameterBag, "node">("node")
  const sourceFile = flow(node, (value) => value.getSourceFile())

  return flow(sourceFile, strictEqual(context.sourceFile))
}

const bagHasNoExemptRole = (index: ConceptIndex) => (bag: ParameterBag) => {
  const roles = rolesFor(index)(bag.model)
  const isBoundary = HashSet.has(roles, "boundary")
  const isInvariant = HashSet.has(roles, "invariant")
  const isProtocol = HashSet.has(roles, "protocol")
  const exemptions = Array.make(isBoundary, isInvariant, isProtocol)

  return Array.every(exemptions, (exempt) => !exempt)
}

const parameterBagQuery: ConceptQuery<readonly [string, string]> = (index) => (context) => {
  const makeMatch = (bag: ParameterBag) => {
    const fact = Tuple.make(bag.functionEntry.name, bag.model.name)

    return makeNodeMatch(bag.node, fact)
  }

  return pipe(
    index.parameterBags,
    Array.filter(bagIsInContext(context)),
    Array.filter(bagHasNoExemptRole(index)),
    Array.map(makeMatch)
  )
}

export const parameterBagScanner = makeConceptQueryScanner(parameterBagQuery)

const makeMessageForParameterBag = (
  match: Match<typeof parameterBagScanner extends Scanner<infer Fact> ? Fact : never>
) => {
  const functionName = Tuple.get(match.fact, 0)
  const modelName = Tuple.get(match.fact, 1)

  return makeRuleMessage(
    `${modelName} is constructed only to cross the ${functionName} call seam.`,
    "Remove or deepen the function seam, reuse existing domain values, or make this model a genuine command with independent semantics. Do not explode it into primitive parameters or an anonymous object type."
  )
}

const parameterBagMessage: RuleMessage<
  typeof parameterBagScanner extends Scanner<infer Fact> ? Fact : never
> = Function.constant(makeMessageForParameterBag)

export const parameterBag = makeRule("parameter-bag")(parameterBagScanner)(parameterBagMessage)
