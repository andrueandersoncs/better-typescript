import { Array, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { importedEffectApiAt } from "./functionalCoreEffect/importedEffectApiAt.js"
import { isExactForwarder } from "./isExactForwarder.js"

// NoTrivialEffectFnFact is empty because the forwarding shape needs no extra payload.
export const NoTrivialEffectFnFact = Schema.Struct({})

const noTrivialEffectFnFact = NoTrivialEffectFnFact.make({})

const variableDeclarationKinds = Array.of(ts.SyntaxKind.VariableDeclaration)
const effectFnNames = Array.of("fn")

export interface NoTrivialEffectFnFact extends Schema.Schema.Type<typeof NoTrivialEffectFnFact> {}

const isEffectFnCall = (context: MatchContext) => (call: ts.CallExpression) =>
  importedEffectApiAt(context.checker, call.expression, "Effect", effectFnNames)

const effectFnGenerator = (context: MatchContext, declaration: ts.VariableDeclaration) =>
  Option.gen(function* () {
    const initializer = yield* pipe(
      Option.fromNullishOr(declaration.initializer),
      Option.filter(ts.isCallExpression)
    )

    yield* pipe(
      Option.liftPredicate(ts.isCallExpression)(initializer.expression),
      Option.filter(isEffectFnCall(context))
    )

    return yield* Array.findFirst(initializer.arguments, ts.isFunctionExpression)
  })

const makeTrivialEffectFnMatch = (declaration: ts.VariableDeclaration) =>
  makeNodeMatch(declaration.name, noTrivialEffectFnFact)

const makeTrivialEffectFnMatches =
  (context: MatchContext) => (declaration: ts.VariableDeclaration) => {
    const match = makeTrivialEffectFnMatch(declaration)

    return pipe(
      effectFnGenerator(context, declaration),
      Option.filter(isExactForwarder),
      Option.as(match),
      Option.toArray
    )
  }

export const noTrivialEffectFnMatcher = nodeMatcher(variableDeclarationKinds)(
  ts.isVariableDeclaration
)(makeTrivialEffectFnMatches)
