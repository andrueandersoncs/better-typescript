import { Array, Function, HashMap, Option, Order, Struct, Tuple, flow, pipe } from "effect"
import { strictEqual } from "../../internal/equivalence.js"
import { makeRule } from "../../internal/rule/makeRule.js"
import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"
import type { RuleMessage } from "../../internal/rule/ruleMessage.js"
import type { Match } from "../../internal/scanner/match.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { Scanner } from "../../internal/scanner/scannerData.js"
import type {
  ConceptIndex,
  DataStructureEntry
} from "../../internal/builtins/concepts/conceptIndex.js"
import { entriesForContext } from "../../internal/builtins/concepts/conceptIndexQueries.js"
import { makeConceptQueryScanner } from "../../internal/builtins/concepts/conceptQueryScanner.js"
import type { ConceptQuery } from "../../internal/builtins/concepts/conceptQueryScanner.js"

const entryOrder = Order.mapInput(
  Order.String,
  (entry: DataStructureEntry) => `${entry.sourceFile.fileName}:${entry.name}`
)

const duplicateTarget = (index: ConceptIndex) => (entry: DataStructureEntry) => {
  const shapeGroup = (shape: string) => HashMap.get(index.shapeGroups, shape)
  const hasDuplicate = (group: ReadonlyArray<DataStructureEntry>) => group.length > 1
  const entrySymbol = Struct.get<DataStructureEntry, "symbol">("symbol")
  const isEntry = flow(entrySymbol, strictEqual(entry.symbol))
  const isOtherEntry = flow(isEntry, strictEqual(false))
  const sortGroup = (group: ReadonlyArray<DataStructureEntry>) => Array.sort(group, entryOrder)

  return pipe(
    entry.shape,
    Option.flatMap(shapeGroup),
    Option.filter(hasDuplicate),
    Option.map(sortGroup),
    Option.flatMap(Array.head),
    Option.filter(isOtherEntry)
  )
}

const duplicateShapeQuery: ConceptQuery<readonly [string, string]> = (index) => (context) => {
  const matchesForEntry = (entry: DataStructureEntry) => {
    const makeMatchForTarget = (target: DataStructureEntry) => {
      const fact = Tuple.make(entry.name, target.name)

      return makeNodeMatch(entry.nameNode, fact)
    }

    return pipe(duplicateTarget(index)(entry), Option.map(makeMatchForTarget), Option.toArray)
  }

  const entries = entriesForContext(index)(context)

  return Array.flatMap(entries, matchesForEntry)
}

export const duplicateShapeScanner = makeConceptQueryScanner(duplicateShapeQuery)

const makeMessageForDuplicateShape = (
  match: Match<typeof duplicateShapeScanner extends Scanner<infer Fact> ? Fact : never>
) => {
  const entryName = Tuple.get(match.fact, 0)
  const targetName = Tuple.get(match.fact, 1)

  return makeRuleMessage(
    `${entryName} duplicates the concrete structure of ${targetName}.`,
    "Reuse the existing data structure or merge the concepts. Keep a distinct representation only for an independently evolving boundary or invariant, and retain the duplicate evidence for review."
  )
}

const duplicateShapeMessage: RuleMessage<
  typeof duplicateShapeScanner extends Scanner<infer Fact> ? Fact : never
> = Function.constant(makeMessageForDuplicateShape)

export const duplicateShape =
  makeRule("duplicate-shape")(duplicateShapeScanner)(duplicateShapeMessage)
