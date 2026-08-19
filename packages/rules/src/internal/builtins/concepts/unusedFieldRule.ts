import { Array, Function, HashSet, Option, Struct, Tuple, pipe } from "effect"
import type * as ts from "typescript"
import { makeRule } from "../../rule/makeRule.js"
import { makeRuleMessage } from "../../rule/makeRuleMessage.js"
import type { RuleMessage } from "../../rule/ruleMessage.js"
import type { Match } from "../../scanner/match.js"
import { makeNodeMatch } from "../../scanner/makeNodeMatch.js"
import type { Scanner } from "../../scanner/scannerData.js"
import { referenceKey } from "../../support/referenceKey.js"
import type { ConceptIndex, DataStructureEntry } from "./conceptIndex.js"
import { entriesForContext, rolesFor } from "./conceptIndexQueries.js"
import { makeConceptQueryScanner } from "./conceptQueryScanner.js"
import type { ConceptQuery } from "./conceptQueryScanner.js"

const unreadFields = (index: ConceptIndex) => (entry: DataStructureEntry) => {
  const roles = rolesFor(index)(entry)
  const isBoundary = HashSet.has(roles, "boundary")
  const isProtocol = HashSet.has(roles, "protocol")
  const reflectionChecks = Array.make(isBoundary, isProtocol)
  const externallyReflected = Array.some(reflectionChecks, Boolean)

  if (externallyReflected) {
    return Array.empty<ts.Symbol>()
  }

  const readFields = pipe(index.fieldReads, Array.map(Struct.get("field")), HashSet.fromIterable)

  return Array.filter(entry.fieldSymbols, (field) => {
    const fieldKey = referenceKey(field)
    const fieldName = field.getName()
    const directlyRead = HashSet.has(readFields, fieldKey)
    const functionallyRead = HashSet.has(index.readFieldNames, fieldName)
    const readChecks = Array.make(directlyRead, functionallyRead)

    return Array.every(readChecks, (read) => !read)
  })
}

const unusedFieldQuery: ConceptQuery<readonly [string, string]> = (index) => (context) => {
  const matchesForEntry = (entry: DataStructureEntry) => {
    const makeMatchForField = (field: ts.Symbol) => {
      const declarations = field.declarations ?? Array.empty<ts.Declaration>()

      const node = pipe(
        declarations,
        Array.head,
        Option.getOrElse(Function.constant(entry.nameNode))
      )

      const fieldName = field.getName()
      const fact = Tuple.make(entry.name, fieldName)

      return makeNodeMatch(node, fact)
    }

    return pipe(unreadFields(index)(entry), Array.map(makeMatchForField))
  }

  const entries = entriesForContext(index)(context)

  return Array.flatMap(entries, matchesForEntry)
}

export const unusedFieldScanner = makeConceptQueryScanner(unusedFieldQuery)

const makeMessageForUnusedField = (
  match: Match<typeof unusedFieldScanner extends Scanner<infer Fact> ? Fact : never>
) => {
  const entryName = Tuple.get(match.fact, 0)
  const fieldName = Tuple.get(match.fact, 1)

  return makeRuleMessage(
    `${entryName}.${fieldName} is constructed but never independently read.`,
    "Delete the speculative field or connect it to behavior that consumes its semantics. Mechanical forwarding into another representation is not a read and instead indicates parallel concepts."
  )
}

const unusedFieldMessage: RuleMessage<
  typeof unusedFieldScanner extends Scanner<infer Fact> ? Fact : never
> = Function.constant(makeMessageForUnusedField)

export const unusedField = makeRule("unused-field")(unusedFieldScanner)(unusedFieldMessage)
