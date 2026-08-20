import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array } from "effect"
import * as ts from "typescript"
import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"
import { makeRule } from "../../internal/rule/makeRule.js"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import type { Match as ScannerMatch } from "../../internal/scanner/match.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { importedEffectApiAt } from "../../internal/support/effectApi/importedEffectApiAt.js"
import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

const contextServiceNames = Array.of("Service")

const preferContextServiceClassCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const isContextService = importedEffectApiAt(context.checker)("Context")(contextServiceNames)(
      node.expression
    )

    const hasKeyArgument = node.arguments.length > 0
    const shouldReportParts = Array.make(isContextService, hasKeyArgument)
    const shouldReport = Array.every(shouldReportParts, Boolean)
    const finding = makeSubjectMatch("Context.Service")(node.expression)

    return shouldReport ? Array.of(finding) : noSubjectMatches
  }

const preferContextServiceClassScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  preferContextServiceClassCandidates
)

export const preferContextServiceClass = makeRule("prefer-context-service-class")(
  preferContextServiceClassScanner
)(
  fixedRuleMessage(
    "Prefer a class extending Context.Service for service definitions.",
    "Pass the service interface as the Shape type parameter."
  )
)
