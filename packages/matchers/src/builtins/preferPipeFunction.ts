import { Array, Option, pipe, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"
import { symbolDeclaredInEffectPackage } from "../support/tsSignature.js"
import { strictEqual } from "../equivalence.js"

// PreferPipeFunctionFact is empty payload because guidance and matchers share identity.
export const PreferPipeFunctionFact = Schema.Struct({})

export interface PreferPipeFunctionFact extends Schema.Schema.Type<typeof PreferPipeFunctionFact> {}

// emptyPreferPipeFunctionFact is empty payload because guidance and matchers share identity.
export const emptyPreferPipeFunctionFact = PreferPipeFunctionFact.make({})

const isPipeName = (access: ts.PropertyAccessExpression) => strictEqual("pipe")(access.name.text)

const callExpressionKinds = Array.of(ts.SyntaxKind.CallExpression)

const pipeFunctionMatches = (context: MatchContext) => {
  const checker = context.checker

  const isEffectPipeAccess = (access: ts.PropertyAccessExpression) =>
    pipe(
      checker.getSymbolAtLocation(access.name),
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

export const preferPipeFunctionMatcher = nodeMatcher(callExpressionKinds)(ts.isCallExpression)(
  pipeFunctionMatches
)
