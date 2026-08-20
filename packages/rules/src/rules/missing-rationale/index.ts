import { Array, Function, Struct, Tuple, flow, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../internal/equivalence.js"
import { makeRule } from "../../internal/rule/makeRule.js"
import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"
import type { RuleMessage } from "../../internal/rule/ruleMessage.js"
import type { Match } from "../../internal/scanner/match.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { Scanner } from "../../internal/scanner/scannerData.js"
import type { DataStructureEntry } from "../../internal/builtins/concepts/conceptIndex.js"
import { entriesForContext } from "../../internal/builtins/concepts/conceptIndexQueries.js"
import { makeConceptQueryScanner } from "../../internal/builtins/concepts/conceptQueryScanner.js"
import type { ConceptQuery } from "../../internal/builtins/concepts/conceptQueryScanner.js"

const rationaleIsComplete = (entry: DataStructureEntry) => {
  const sourceText = entry.sourceFile.getFullText()
  const ranges = ts.getLeadingCommentRanges(sourceText, entry.documentationNode.pos) ?? []

  const rangeIsSingleLine = flow(
    Struct.get<ts.CommentRange, "kind">("kind"),
    strictEqual(ts.SyntaxKind.SingleLineCommentTrivia)
  )

  const proseForRange = (range: ts.CommentRange) =>
    sourceText.slice(range.pos + 2, range.end).trim()

  const prose = pipe(
    ranges,
    Array.filter(rangeIsSingleLine),
    Array.map(proseForRange),
    Array.join(" ")
  )

  return prose.toLowerCase().includes("because")
}

const missingRationaleQuery: ConceptQuery<readonly [string]> = (index) => (context) => {
  const rationaleIsMissing = (entry: DataStructureEntry) => !rationaleIsComplete(entry)

  const makeMatch = (entry: DataStructureEntry) => {
    const fact = Tuple.make(entry.name)

    return makeNodeMatch(entry.nameNode, fact)
  }

  const entries = entriesForContext(index)(context)

  return pipe(entries, Array.filter(rationaleIsMissing), Array.map(makeMatch))
}

export const missingRationaleScanner = makeConceptQueryScanner(missingRationaleQuery)

const makeMessageForMissingRationale = (
  match: Match<typeof missingRationaleScanner extends Scanner<infer Fact> ? Fact : never>
) => {
  const entryName = Tuple.get(match.fact, 0)

  return makeRuleMessage(
    `${entryName} lacks a complete, structurally supported data-structure rationale.`,
    "Delete or reuse this concept before documenting it. If it remains, add one single-line comment directly above the declaration explaining because why existing concepts are insufficient. The prose does not suppress structural evidence."
  )
}

const missingRationaleMessage: RuleMessage<
  typeof missingRationaleScanner extends Scanner<infer Fact> ? Fact : never
> = Function.constant(makeMessageForMissingRationale)

export const missingRationale =
  makeRule("missing-rationale")(missingRationaleScanner)(missingRationaleMessage)
