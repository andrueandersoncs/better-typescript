import { Array, Function, HashMap, HashSet, Option, Result, Tuple, pipe } from "effect"
import type * as ts from "typescript"
import { makeRule } from "../../rule/makeRule.js"
import { makeRuleMessage } from "../../rule/makeRuleMessage.js"
import type { RuleMessage } from "../../rule/ruleMessage.js"
import { makeNodeMatch } from "../../scanner/makeNodeMatch.js"
import type { Match } from "../../scanner/match.js"
import type { Scanner } from "../../scanner/scannerData.js"
import { referenceKey } from "../../support/referenceKey.js"
import type { ReferenceKey } from "../../support/referenceKeyType.js"
import type { ConceptIndex, DataStructureEntry } from "./conceptIndex.js"
import { entriesForContext, rolesFor } from "./conceptIndexQueries.js"
import { makeConceptQueryScanner } from "./conceptQueryScanner.js"
import type { ConceptQuery } from "./conceptQueryScanner.js"
import type { FunctionEntry } from "./functionEntry.js"

const closedOwner = (index: ConceptIndex) => (entry: DataStructureEntry) => {
  const roles = rolesFor(index)(entry)

  if (HashSet.size(roles) > 0) {
    return Option.none<FunctionEntry>()
  }

  const entryKey = referenceKey(entry.symbol)
  const owners = pipe(HashMap.get(index.ownersByData, entryKey), Option.getOrElse(HashSet.empty))

  const ownerEntry = (ownerKey: ReferenceKey<ts.Symbol>) =>
    pipe(HashMap.get(index.functionBySymbol, ownerKey), Result.fromOption(Function.constVoid))

  const functionOwners = pipe(owners, Array.fromIterable, Array.filterMap(ownerEntry))

  return Array.findFirst(functionOwners, (candidate) => {
    const candidateKey = referenceKey(candidate.symbol)

    const callers = pipe(
      HashMap.get(index.ownersByFunction, candidateKey),
      Option.getOrElse(HashSet.empty)
    )

    const allowedOwners = HashSet.add(callers, candidateKey)
    const ownerIsAllowed = (owner: ReferenceKey<ts.Symbol>) => HashSet.has(allowedOwners, owner)
    const ownersStayInside = HashSet.every(owners, ownerIsAllowed)

    return HashSet.size(callers) <= 1 && ownersStayInside
  })
}

const closedAbstractionQuery: ConceptQuery<readonly [string, string]> = (index) => (context) => {
  const matchesForEntry = (entry: DataStructureEntry) => {
    const makeMatchForOwner = (owner: FunctionEntry) => {
      const fact = Tuple.make(entry.name, owner.name)

      return makeNodeMatch(entry.nameNode, fact)
    }

    return pipe(closedOwner(index)(entry), Option.map(makeMatchForOwner), Option.toArray)
  }

  const entries = entriesForContext(index)(context)

  return Array.flatMap(entries, matchesForEntry)
}

export const closedAbstractionScanner = makeConceptQueryScanner(closedAbstractionQuery)

const makeMessageForClosedAbstraction = (
  match: Match<typeof closedAbstractionScanner extends Scanner<infer Fact> ? Fact : never>
) => {
  const entryName = Tuple.get(match.fact, 0)
  const ownerName = Tuple.get(match.fact, 1)

  return makeRuleMessage(
    `${entryName} and ${ownerName} form a closed abstraction with at most one external owner.`,
    "Collapse the function and its private data vocabulary into their external owner, reuse an existing concept, or deepen the Module until the abstraction has independent leverage. Do not replace the named model with an anonymous object type."
  )
}

const closedAbstractionMessage: RuleMessage<
  typeof closedAbstractionScanner extends Scanner<infer Fact> ? Fact : never
> = Function.constant(makeMessageForClosedAbstraction)

export const closedAbstraction =
  makeRule("closed-abstraction")(closedAbstractionScanner)(closedAbstractionMessage)
