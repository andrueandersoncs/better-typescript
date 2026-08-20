import { Array, Schema } from "effect"
import * as ts from "typescript"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"
import { makeRule } from "../../internal/rule/makeRule.js"
import { isProcessEnvironmentProductionSource } from "./isProcessEnvironmentProductionSource.js"
import { isAccessExpression } from "./isAccessExpression.js"
import { isOutermostAccess } from "./isOutermostAccess.js"
import { isProcessEnvironmentAccess } from "./processEnvironmentAccess.js"

// ProcessEnvironmentFact exists because the named rule needs one stable fact contract.
export const ProcessEnvironmentFact = Schema.Struct({})

export interface ProcessEnvironmentFact extends Schema.Schema.Type<typeof ProcessEnvironmentFact> {}

const processEnvironmentFact = ProcessEnvironmentFact.make({})

const accessKinds = Array.make(
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression
)

const processEnvironmentMatches =
  (context: MatchContext) => (node: ts.PropertyAccessExpression | ts.ElementAccessExpression) => {
    const processEnvironment = isProcessEnvironmentAccess(context.checker)(node)
    const outermost = isOutermostAccess(node)
    const productionSource = isProcessEnvironmentProductionSource(context)
    const reportChecks = Array.make(processEnvironment, outermost, productionSource)
    const shouldReport = Array.every(reportChecks, Boolean)
    const match = makeNodeMatch(node, processEnvironmentFact)

    return shouldReport ? Array.of(match) : Array.empty()
  }

const processEnvironmentScanner =
  makeNodeScanner(accessKinds)(isAccessExpression)(processEnvironmentMatches)

export const processEnvironment = makeRule("process-environment")(processEnvironmentScanner)(
  fixedRuleMessage(
    "Read runtime configuration through Effect Config, not process.env.",
    "Read the key in a Config-backed layer and provide deterministic config in tests."
  )
)
