import {
  Array,
  Function,
  HashMap,
  HashSet,
  Iterable,
  Option,
  Result,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import type * as ts from "typescript"
import { strictEqual } from "../../equivalence.js"
import { makeRule } from "../../rule/makeRule.js"
import { makeRuleMessage } from "../../rule/makeRuleMessage.js"
import type { RuleMessage } from "../../rule/ruleMessage.js"
import type { Match } from "../../scanner/match.js"
import { makeNodeMatch } from "../../scanner/makeNodeMatch.js"
import type { Scanner } from "../../scanner/scannerData.js"
import { referenceKey } from "../../support/referenceKey.js"
import type { ReferenceKey } from "../../support/referenceKeyType.js"
import type { ConceptIndex, DataStructureEntry } from "./conceptIndex.js"
import { entriesForContext, rolesFor } from "./conceptIndexQueries.js"
import { makeConceptQueryScanner } from "./conceptQueryScanner.js"
import type { ConceptQuery } from "./conceptQueryScanner.js"
import type { FunctionEntry } from "./functionEntry.js"

const structuralRoleSuffixes = HashSet.make(
  "Context",
  "Data",
  "Info",
  "Input",
  "Model",
  "Options",
  "Output",
  "Params",
  "Result",
  "State"
)

const functionDerivedStem = (name: string) => {
  const withoutSuffix = (suffix: string) => name.slice(0, -suffix.length)
  const nameEndsWith = (suffix: string) => name.endsWith(suffix)
  const stemHasText = (stem: string) => stem.length > 0

  return pipe(
    structuralRoleSuffixes,
    Iterable.findFirst(nameEndsWith),
    Option.map(withoutSuffix),
    Option.filter(stemHasText)
  )
}

const functionDerivedOwner = (index: ConceptIndex) => (entry: DataStructureEntry) => {
  const roles = rolesFor(index)(entry)
  const isBoundary = HashSet.has(roles, "boundary")
  const isProtocol = HashSet.has(roles, "protocol")
  const roleChecks = Array.make(isBoundary, isProtocol)
  const roleExempt = Array.some(roleChecks, Boolean)

  if (roleExempt) {
    return Option.none<FunctionEntry>()
  }

  const entryKey = referenceKey(entry.symbol)
  const owners = pipe(HashMap.get(index.ownersByData, entryKey), Option.getOrElse(HashSet.empty))

  const ownerEntry = (ownerKey: ReferenceKey<ts.Symbol>) =>
    pipe(HashMap.get(index.functionBySymbol, ownerKey), Result.fromOption(Function.constVoid))

  const functionOwners = pipe(owners, Array.fromIterable, Array.filterMap(ownerEntry))

  const ownerMatchingStem = (stem: string) => {
    const lowerStem = stem.toLowerCase()
    const ownerName = Struct.get<FunctionEntry, "name">("name")
    const lowerOwnerName = flow(ownerName, (name) => name.toLowerCase())
    const nameMatches = flow(lowerOwnerName, strictEqual(lowerStem))

    return Array.findFirst(functionOwners, nameMatches)
  }

  const ownershipStaysInside = (owner: FunctionEntry) => {
    const ownerKey = referenceKey(owner.symbol)

    const callers = pipe(
      HashMap.get(index.ownersByFunction, ownerKey),
      Option.getOrElse(HashSet.empty)
    )

    const allowedOwners = HashSet.add(callers, ownerKey)

    const ownerIsAllowed = (candidate: ReferenceKey<ts.Symbol>) =>
      HashSet.has(allowedOwners, candidate)

    return HashSet.every(owners, ownerIsAllowed)
  }

  return pipe(
    functionDerivedStem(entry.name),
    Option.flatMap(ownerMatchingStem),
    Option.filter(ownershipStaysInside)
  )
}

const functionDerivedModelQuery: ConceptQuery<readonly [string]> = (index) => (context) => {
  const matchesForEntry = (entry: DataStructureEntry) => {
    const makeMatch = () => {
      const fact = Tuple.make(entry.name)

      return makeNodeMatch(entry.nameNode, fact)
    }

    return pipe(functionDerivedOwner(index)(entry), Option.map(makeMatch), Option.toArray)
  }

  const entries = entriesForContext(index)(context)

  return Array.flatMap(entries, matchesForEntry)
}

export const functionDerivedModelScanner = makeConceptQueryScanner(functionDerivedModelQuery)

const makeMessageForFunctionDerivedModel = (
  match: Match<typeof functionDerivedModelScanner extends Scanner<infer Fact> ? Fact : never>
) => {
  const entryName = Tuple.get(match.fact, 0)

  return makeRuleMessage(
    `${entryName} is named after its sole function role instead of independent semantics.`,
    "Remove or deepen the function-data abstraction, or replace this structural-role name with an existing domain concept. A new name must mean more than input, output, options, context, state, or result for one function."
  )
}

const functionDerivedModelMessage: RuleMessage<
  typeof functionDerivedModelScanner extends Scanner<infer Fact> ? Fact : never
> = Function.constant(makeMessageForFunctionDerivedModel)

export const functionDerivedModel = makeRule("function-derived-model")(functionDerivedModelScanner)(
  functionDerivedModelMessage
)
