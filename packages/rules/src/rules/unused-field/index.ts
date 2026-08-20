import { Array, Function, HashSet, Option, Struct, Tuple, pipe } from "effect"
import type * as ts from "typescript"
import { makeRule } from "../../internal/rule/makeRule.js"
import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"
import type { RuleMessage } from "../../internal/rule/ruleMessage.js"
import type { Match } from "../../internal/scanner/match.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { Scanner } from "../../internal/scanner/scannerData.js"
import { referenceKey } from "../../internal/support/referenceKey.js"
import type {
  ConceptIndex,
  DataStructureEntry
} from "../../internal/builtins/concepts/conceptIndex.js"
import {
  entriesForContext,
  rolesFor
} from "../../internal/builtins/concepts/conceptIndexQueries.js"
import { makeConceptQueryScanner } from "../../internal/builtins/concepts/conceptQueryScanner.js"
import type { ConceptQuery } from "../../internal/builtins/concepts/conceptQueryScanner.js"

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
