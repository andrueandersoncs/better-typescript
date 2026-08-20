import { Array, Function, HashMap, HashSet, Option, Struct, Tuple, flow, pipe } from "effect"
import type * as ts from "typescript"
import { strictEqual } from "../../internal/equivalence.js"
import { makeRule } from "../../internal/rule/makeRule.js"
import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"
import type { RuleMessage } from "../../internal/rule/ruleMessage.js"
import type { Match } from "../../internal/scanner/match.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { Scanner } from "../../internal/scanner/scannerData.js"
import { fieldSeparator } from "../../internal/support/fieldSeparator.js"
import { recordSeparator } from "../../internal/support/recordSeparator.js"
import { referenceKey } from "../../internal/support/referenceKey.js"
import type { ReferenceKey } from "../../internal/support/referenceKeyType.js"
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

const declarationSourceFileName = (declaration: string) =>
  pipe(declaration.split(fieldSeparator), Array.head)

const referenceKeySourceFileName = (key: ReferenceKey) =>
  pipe(key.split(recordSeparator), Array.get(1), Option.flatMap(declarationSourceFileName))

const isSpeculativeExport =
  (program: ts.Program) => (index: ConceptIndex) => (entry: DataStructureEntry) => {
    const roles = rolesFor(index)(entry)
    const isBoundary = HashSet.has(roles, "boundary")
    const isProtocol = HashSet.has(roles, "protocol")
    const roleChecks = Array.make(isBoundary, isProtocol)
    const roleExempt = Array.some(roleChecks, Boolean)
    const notRoleExempt = !roleExempt
    const eligibleChecks = Array.make(entry.exported, notRoleExempt)
    const eligible = Array.every(eligibleChecks, Boolean)

    const sourceFileOf = Struct.get<{ readonly sourceFile: ts.SourceFile }, "sourceFile">(
      "sourceFile"
    )

    const ownerSourceFile = (owner: ReferenceKey<ts.Symbol>) => {
      const knownOwner = pipe(
        HashMap.get(index.functionBySymbol, owner),
        Option.map(sourceFileOf),
        Option.orElse(() => pipe(HashMap.get(index.dataBySymbol, owner), Option.map(sourceFileOf)))
      )

      const getSourceFile = (fileName: string) => program.getSourceFile(fileName)
      const sourceFileForName = flow(getSourceFile, Option.fromNullishOr)

      const declaredOwner = pipe(
        referenceKeySourceFileName(owner),
        Option.flatMap(sourceFileForName)
      )

      return pipe(knownOwner, Option.orElse(Function.constant(declaredOwner)))
    }

    const entryKey = referenceKey(entry.symbol)
    const owners = pipe(HashMap.get(index.ownersByData, entryKey), Option.getOrElse(HashSet.empty))
    const differsFromEntry = flow(strictEqual(entry.sourceFile), strictEqual(false))

    const ownerIsExternal = (owner: ReferenceKey<ts.Symbol>) =>
      pipe(ownerSourceFile(owner), Option.exists(differsFromEntry))

    const hasExternalOwner = HashSet.some(owners, ownerIsExternal)
    const noExternalOwner = !hasExternalOwner
    const speculativeChecks = Array.make(eligible, noExternalOwner)

    return Array.every(speculativeChecks, Boolean)
  }

const speculativeExportQuery: ConceptQuery<readonly [string]> = (index) => (context) => {
  const isSpeculative = isSpeculativeExport(context.program)(index)

  const makeMatch = (entry: DataStructureEntry) => {
    const fact = Tuple.make(entry.name)

    return makeNodeMatch(entry.nameNode, fact)
  }

  const entries = entriesForContext(index)(context)

  return pipe(entries, Array.filter(isSpeculative), Array.map(makeMatch))
}

export const speculativeExportScanner = makeConceptQueryScanner(speculativeExportQuery)

const makeMessageForSpeculativeExport = (
  match: Match<typeof speculativeExportScanner extends Scanner<infer Fact> ? Fact : never>
) => {
  const entryName = Tuple.get(match.fact, 0)

  return makeRuleMessage(
    `${entryName} is exported without an independent first-party consumer or established boundary.`,
    "Remove the export and keep ownership local, or connect the model to an intentional public seam. Exporting a declaration does not establish reuse and must not evade abstraction analysis."
  )
}

const speculativeExportMessage: RuleMessage<
  typeof speculativeExportScanner extends Scanner<infer Fact> ? Fact : never
> = Function.constant(makeMessageForSpeculativeExport)

export const speculativeExport =
  makeRule("speculative-export")(speculativeExportScanner)(speculativeExportMessage)
