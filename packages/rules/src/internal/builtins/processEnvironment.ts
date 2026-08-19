import { Array, Schema } from "effect"
import * as ts from "typescript"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { isProcessEnvironmentProductionSource } from "../support/isProcessEnvironmentProductionSource.js"
import { isAccessExpression } from "./effectQuality/isAccessExpression.js"
import { isOutermostAccess } from "./effectQuality/isOutermostAccess.js"
import { isProcessEnvironmentAccess } from "./effectQuality/processEnvironmentAccess.js"

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

export const processEnvironmentScanner =
  makeNodeScanner(accessKinds)(isAccessExpression)(processEnvironmentMatches)
