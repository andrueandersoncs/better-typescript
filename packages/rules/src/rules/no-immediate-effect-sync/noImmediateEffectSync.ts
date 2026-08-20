import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Function, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../internal/equivalence.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { isBlockOrSourceFile } from "./isBlockOrSourceFile.js"
import { referencesToSymbol } from "../../internal/builtins/referencesToSymbol.js"
import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"
import { importedEffectApiAt } from "../../internal/support/effectApi/importedEffectApiAt.js"
import { symbolOptionAt } from "../../internal/builtins/symbolOptionAt.js"

// NoImmediateEffectSyncFact is empty because the matched local flow needs no extra payload.
export const NoImmediateEffectSyncFact = Schema.Struct({})

export interface NoImmediateEffectSyncFact extends Schema.Schema.Type<
  typeof NoImmediateEffectSyncFact
> {}

const noImmediateEffectSyncFact = NoImmediateEffectSyncFact.make({})
const runSyncNames = Array.of("runSync")
const syncNames = Array.of("sync")

const containingStatement = (node: ts.Node) =>
  pipe(ts.findAncestor(node, ts.isStatement), Option.fromNullishOr)

const precedingVariableStatement = (statement: ts.Statement) =>
  Option.gen(function* () {
    const container = yield* pipe(statement.parent, Option.liftPredicate(isBlockOrSourceFile))
    const index = container.statements.indexOf(statement)

    return yield* pipe(
      Array.get(container.statements, index - 1),
      Option.filter(ts.isVariableStatement)
    )
  })

const declarationSymbol = (checker: ts.TypeChecker) => (declaration: ts.VariableDeclaration) =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(declaration.name),
    Option.flatMap(symbolOptionAt(checker))
  )

const initializerIsEffectSync =
  (context: MatchContext) => (declaration: ts.VariableDeclaration) => {
    const isEffectSyncCall = (call: ts.CallExpression) =>
      importedEffectApiAt(context.checker)("Effect")(syncNames)(call.expression)

    return pipe(
      Option.fromNullishOr(declaration.initializer),
      Option.map(unwrapTransparentExpression),
      Option.filter(ts.isCallExpression),
      Option.exists(isEffectSyncCall)
    )
  }

const matchingSyncDeclaration =
  (context: MatchContext) =>
  (statement: ts.VariableStatement) =>
  (argument: ts.Identifier) =>
  (container: ts.Block | ts.SourceFile) =>
    Option.gen(function* () {
      const argumentSymbol = yield* symbolOptionAt(context.checker)(argument)

      const hasArgumentSymbol = (candidate: ts.VariableDeclaration) =>
        pipe(
          declarationSymbol(context.checker)(candidate),
          Option.exists(strictEqual(argumentSymbol))
        )

      const isEffectSyncDeclaration = initializerIsEffectSync(context)

      const declaration = yield* pipe(
        Array.fromIterable(statement.declarationList.declarations),
        Array.findFirst(hasArgumentSymbol),
        Option.filter(isEffectSyncDeclaration)
      )

      const referenceCount = referencesToSymbol(context.checker)(argumentSymbol)(container)
      yield* pipe(referenceCount, Option.liftPredicate(strictEqual(2)))

      return declaration
    })

const immediateEffectSyncMatches = (context: MatchContext) => (call: ts.CallExpression) => {
  const candidate = Option.gen(function* () {
    const isRunSync = importedEffectApiAt(context.checker)("Effect")(runSyncNames)(call.expression)
    yield* Option.liftPredicate(Function.constant(isRunSync))(call)

    const argument = yield* pipe(Array.head(call.arguments), Option.filter(ts.isIdentifier))
    const statement = yield* containingStatement(call)
    const container = yield* pipe(statement.parent, Option.liftPredicate(isBlockOrSourceFile))
    const previous = yield* precedingVariableStatement(statement)

    return yield* matchingSyncDeclaration(context)(previous)(argument)(container)
  })

  const match = makeNodeMatch(call.expression, noImmediateEffectSyncFact)

  return pipe(candidate, Option.as(match), Option.toArray)
}

export const noImmediateEffectSyncScanner = makeNodeScanner(callExpressionKinds)(
  ts.isCallExpression
)(immediateEffectSyncMatches)
