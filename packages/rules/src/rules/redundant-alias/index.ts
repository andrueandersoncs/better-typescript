import { Array, Function, HashMap, HashSet, Option, Struct, Tuple, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../internal/equivalence.js"
import { makeRule } from "../../internal/rule/makeRule.js"
import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"
import type { RuleMessage } from "../../internal/rule/ruleMessage.js"
import type { Match } from "../../internal/scanner/match.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { Scanner } from "../../internal/scanner/scannerData.js"
import { canonicalSymbol } from "../../internal/support/canonicalSymbol.js"
import { referenceKey } from "../../internal/support/referenceKey.js"
import type {
  ConceptIndex,
  DataStructureEntry
} from "../../internal/builtins/concepts/conceptIndex.js"
import { entriesForContext } from "../../internal/builtins/concepts/conceptIndexQueries.js"
import { makeConceptQueryScanner } from "../../internal/builtins/concepts/conceptQueryScanner.js"
import type { ConceptQuery } from "../../internal/builtins/concepts/conceptQueryScanner.js"

const derivedAliasUtilities = HashSet.make("Omit", "Partial", "Pick", "Readonly", "Required")

const redundantTarget =
  (checker: ts.TypeChecker) =>
  (index: ConceptIndex) =>
  (entry: DataStructureEntry): Option.Option<DataStructureEntry> => {
    const modelAt = (node: ts.Node) => {
      const modelForSymbol = (symbol: ts.Symbol) => {
        const symbolKey = referenceKey(symbol)

        return HashMap.get(index.dataBySymbol, symbolKey)
      }

      return pipe(
        checker.getSymbolAtLocation(node),
        Option.fromNullishOr,
        Option.map(canonicalSymbol(checker)),
        Option.flatMap(modelForSymbol)
      )
    }

    const fromInterface = (declaration: ts.InterfaceDeclaration) => {
      const clauses = declaration.heritageClauses ?? Array.empty<ts.HeritageClause>()
      const types = Array.flatMap(clauses, Struct.get("types"))
      const hasNoMembers = strictEqual(0)(declaration.members.length)
      const hasSingleHeritage = strictEqual(1)(types.length)
      const aliasChecks = Array.make(hasNoMembers, hasSingleHeritage)
      const emptyInterfaceAlias = Array.every(aliasChecks, Boolean)

      return emptyInterfaceAlias
        ? pipe(Array.head(types), Option.map(Struct.get("expression")), Option.flatMap(modelAt))
        : Option.none<DataStructureEntry>()
    }

    const fromReference = (reference: ts.TypeReferenceNode) => {
      const direct = modelAt(reference.typeName)

      if (Option.isSome(direct)) {
        return direct
      }

      const entryKey = referenceKey(entry.symbol)

      const owners = pipe(
        HashMap.get(index.ownersByData, entryKey),
        Option.getOrElse(HashSet.empty)
      )

      const utilityName = reference.typeName.getText()
      const derived = HashSet.has(derivedAliasUtilities, utilityName)
      const singleOwner = HashSet.size(owners) <= 1
      const redundantChecks = Array.make(derived, singleOwner)
      const redundantDerived = Array.every(redundantChecks, Boolean)

      if (!redundantDerived) {
        return Option.none<DataStructureEntry>()
      }

      const typeArguments = reference.typeArguments ?? Array.empty<ts.TypeNode>()

      return pipe(typeArguments, Array.head, Option.flatMap(modelAt))
    }

    if (ts.isInterfaceDeclaration(entry.declaration)) {
      return fromInterface(entry.declaration)
    }

    if (ts.isTypeAliasDeclaration(entry.declaration)) {
      return pipe(
        entry.declaration.type,
        Option.liftPredicate(ts.isTypeReferenceNode),
        Option.flatMap(fromReference)
      )
    }

    return Option.none()
  }

const redundantAliasQuery: ConceptQuery<readonly [string, string]> = (index) => (context) => {
  const targetFor = redundantTarget(context.checker)(index)

  const matchesForEntry = (entry: DataStructureEntry) => {
    const makeMatchForTarget = (target: DataStructureEntry) => {
      const fact = Tuple.make(entry.name, target.name)

      return makeNodeMatch(entry.nameNode, fact)
    }

    return pipe(targetFor(entry), Option.map(makeMatchForTarget), Option.toArray)
  }

  const entries = entriesForContext(index)(context)

  return Array.flatMap(entries, matchesForEntry)
}

export const redundantAliasScanner = makeConceptQueryScanner(redundantAliasQuery)

const makeMessageForRedundantAlias = (
  match: Match<typeof redundantAliasScanner extends Scanner<infer Fact> ? Fact : never>
) => {
  const entryName = Tuple.get(match.fact, 0)
  const targetName = Tuple.get(match.fact, 1)

  return makeRuleMessage(
    `${entryName} renames ${targetName} without adding independent semantics.`,
    `Use ${targetName} directly, merge the concepts, or add a real invariant or independently evolving boundary. Do not keep a second name only to describe structural use.`
  )
}

const redundantAliasMessage: RuleMessage<
  typeof redundantAliasScanner extends Scanner<infer Fact> ? Fact : never
> = Function.constant(makeMessageForRedundantAlias)

export const redundantAlias =
  makeRule("redundant-alias")(redundantAliasScanner)(redundantAliasMessage)
