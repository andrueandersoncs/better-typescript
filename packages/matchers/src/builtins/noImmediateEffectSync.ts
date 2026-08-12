import { Array, Function, Option, Schema, pipe } from "effect"
import { strictEqual } from "../equivalence.js"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { importedEffectApiAt } from "./functionalCoreEffect/importedEffectApiAt.js"
import { identifierText } from "./identifierText.js"

// NoImmediateEffectSyncFact is empty because the matched local flow needs no extra payload.
export const NoImmediateEffectSyncFact = Schema.Struct({})

const noImmediateEffectSyncFact = NoImmediateEffectSyncFact.make({})

const callExpressionKinds = Array.of(ts.SyntaxKind.CallExpression)

const runSyncNames = Array.of("runSync")
const syncNames = Array.of("sync")

export interface NoImmediateEffectSyncFact extends Schema.Schema.Type<
  typeof NoImmediateEffectSyncFact
> {}

const isSingleDeclaration = (statement: ts.VariableStatement) =>
  strictEqual(1)(statement.declarationList.declarations.length)

const isStatementContainer = (parent: ts.Node): parent is ts.Block | ts.SourceFile =>
  ts.isBlock(parent) || ts.isSourceFile(parent)

const statementContainer = (statement: ts.ExpressionStatement) =>
  pipe(statement.parent, Option.liftPredicate(isStatementContainer))

const precedingDeclaration = (statement: ts.ExpressionStatement) =>
  Option.gen(function* () {
    const container = yield* statementContainer(statement)
    const index = container.statements.indexOf(statement)

    const previous = yield* pipe(
      Array.get(container.statements, index - 1),
      Option.filter(ts.isVariableStatement),
      Option.filter(isSingleDeclaration)
    )

    const declaration = yield* Array.head(previous.declarationList.declarations)

    return declaration
  })

const immediateEffectSyncMatches = (context: MatchContext) => (call: ts.CallExpression) => {
  const isRunSync = importedEffectApiAt(context.checker, call.expression, "Effect", runSyncNames)

  const isEffectSync = (effect: ts.CallExpression) =>
    importedEffectApiAt(context.checker, effect.expression, "Effect", syncNames)

  const candidate = Option.gen(function* () {
    const runSync = Function.constant(isRunSync)
    yield* Option.liftPredicate(runSync)(call)
    const argument = yield* pipe(Array.head(call.arguments), Option.filter(ts.isIdentifier))
    const statement = yield* Option.liftPredicate(ts.isExpressionStatement)(call.parent)
    const declaration = yield* precedingDeclaration(statement)
    const initializer = yield* Option.fromNullishOr(declaration.initializer)

    const sameName = pipe(
      Option.liftPredicate(ts.isIdentifier)(declaration.name),
      Option.map(Function.flow(identifierText, strictEqual(argument.text))),
      Option.getOrElse(Function.constFalse)
    )

    yield* Option.liftPredicate(Function.constant(sameName))(declaration)

    const sync = pipe(
      Option.liftPredicate(ts.isCallExpression)(initializer),
      Option.filter(isEffectSync)
    )

    yield* sync

    return declaration
  })

  const match = makeNodeMatch(call.expression, noImmediateEffectSyncFact)

  return pipe(candidate, Option.as(match), Option.toArray)
}

export const noImmediateEffectSyncMatcher = nodeMatcher(callExpressionKinds)(ts.isCallExpression)(
  immediateEffectSyncMatches
)
