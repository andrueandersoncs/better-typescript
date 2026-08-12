import { Array, Function, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { conventionalArchitectureRoleOf } from "../support/conventionalArchitectureRoleOf.js"
import type { ArchitectureRole } from "../support/architectureRoleType.js"
import { toRelativeFileName } from "../support/paths.js"
import { isAccessExpression } from "./effectQuality/isAccessExpression.js"
import { isRootRole } from "./effectQuality/isRootRole.js"
import { isTestRole } from "./effectQuality/isTestRole.js"
import { isOutermostAccess } from "./isOutermostAccess.js"
import { isProcessEnvironmentAccess } from "./processEnvironmentAccess.js"

// ProcessEnvironmentFact exists because the named policy needs one stable fact contract.
export const ProcessEnvironmentFact = Schema.Struct({})

export interface ProcessEnvironmentFact extends Schema.Schema.Type<typeof ProcessEnvironmentFact> {}

const processEnvironmentFact = ProcessEnvironmentFact.make({})

const accessKinds = Array.make(
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression
)

const roleIsProduction = (candidate: ArchitectureRole) => {
  const root = isRootRole(candidate)
  const test = isTestRole(candidate)
  const rootOrTestChecks = Array.make(root, test)
  const isRootOrTest = Array.some(rootOrTestChecks, Boolean)

  return !isRootOrTest
}

const isProductionSource = (context: MatchContext) => {
  const relativePath = toRelativeFileName(context.projectRoot)(context.sourceFile.fileName)
  const role = conventionalArchitectureRoleOf(relativePath)

  return pipe(role, Option.match({ onNone: Function.constTrue, onSome: roleIsProduction }))
}

const processEnvironmentMatches =
  (context: MatchContext) => (node: ts.PropertyAccessExpression | ts.ElementAccessExpression) => {
    const processEnvironment = isProcessEnvironmentAccess(context.checker)(node)
    const outermost = isOutermostAccess(node)
    const productionSource = isProductionSource(context)
    const reportChecks = Array.make(processEnvironment, outermost, productionSource)
    const shouldReport = Array.every(reportChecks, Boolean)
    const match = makeNodeMatch(node, processEnvironmentFact)

    return shouldReport ? Array.of(match) : Array.empty()
  }

export const processEnvironmentMatcher =
  nodeMatcher(accessKinds)(isAccessExpression)(processEnvironmentMatches)
