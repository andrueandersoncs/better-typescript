import { effectQualityStructureKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Option, Struct, flow, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

const anyKeywordType = flow(
  Struct.get<ts.TypeNode, "kind">("kind"),
  strictEqual(ts.SyntaxKind.AnyKeyword)
)

const unsafeCastFindingFromTypeNode = makeSubjectMatch("as any")

const asExpressionHasAnyType = (expression: ts.AsExpression) => anyKeywordType(expression.type)

const typeAssertionHasAnyType = (expression: ts.TypeAssertion) => anyKeywordType(expression.type)

const asExpressionUnsafeCastFinding = (expression: ts.AsExpression) =>
  unsafeCastFindingFromTypeNode(expression.type)

const typeAssertionUnsafeCastFinding = (expression: ts.TypeAssertion) =>
  unsafeCastFindingFromTypeNode(expression.type)

const unsafeCastFindings =
  (_context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const asAny = pipe(
      Option.liftPredicate(ts.isAsExpression)(node),
      Option.filter(asExpressionHasAnyType),
      Option.map(asExpressionUnsafeCastFinding)
    )

    const typeAssertionAny = pipe(
      Option.liftPredicate(ts.isTypeAssertionExpression)(node),
      Option.filter(typeAssertionHasAnyType),
      Option.map(typeAssertionUnsafeCastFinding)
    )

    return pipe(Array.make(asAny, typeAssertionAny), Array.flatMap(Option.toArray))
  }

const unsafeCastsScanner = makeNodeScanner(effectQualityStructureKinds)(acceptsNode)(
  unsafeCastFindings
)

export const unsafeCasts = makeRule("unsafe-casts")(unsafeCastsScanner)(
  fixedRuleMessage(
    "Avoid unchecked `as any` assertions in Effect code.",
    "Model the missing invariant with Schema decoding, a branded type, or a verified narrowing predicate."
  )
)
