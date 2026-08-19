import { Array, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { symbolDeclaredInEffectPackage } from "../support/declarationInEffectPackage.js"
import { strictEqual } from "../equivalence.js"

// PreferPipeFunctionFact exists because its fields form one stable data contract used by the linter.
export const PreferPipeFunctionFact = Schema.Struct({})

export interface PreferPipeFunctionFact extends Schema.Schema.Type<typeof PreferPipeFunctionFact> {}

// emptyPreferPipeFunctionFact exists because its fields form one stable data contract used by the linter.
export const emptyPreferPipeFunctionFact = PreferPipeFunctionFact.make({})

const isPipeName = (access: ts.PropertyAccessExpression) => strictEqual("pipe")(access.name.text)

const callExpressionKinds = Array.of(ts.SyntaxKind.CallExpression)

const pipeFunctionMatches = (context: MatchContext) => {
  const isEffectPipeAccess = (access: ts.PropertyAccessExpression) =>
    pipe(
      context.checker.getSymbolAtLocation(access.name),
      Option.fromNullishOr,
      Option.exists(symbolDeclaredInEffectPackage)
    )

  const matchPipeCallExpression = (callExpression: ts.CallExpression) => {
    const matchAccessName = (access: ts.PropertyAccessExpression) =>
      makeNodeMatch(access.name, emptyPreferPipeFunctionFact)

    return pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(callExpression.expression),
      Option.filter(isPipeName),
      // Rewrite only Effect Pipeable.pipe because Node streams and RxJS keep different pipe
      Option.filter(isEffectPipeAccess),
      Option.map(matchAccessName),
      Option.toArray
    )
  }

  return matchPipeCallExpression
}

export const preferPipeFunctionScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  pipeFunctionMatches
)
