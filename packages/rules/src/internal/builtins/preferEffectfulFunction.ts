import { Array, Function, Option, Schema, Struct, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import type { FunctionDefinition } from "../support/functionDefinition.js"
import { functionInitializer } from "../support/functionInitializer2.js"
import { resolvedSymbolAt } from "../support/resolvedSymbolAt.js"
import { singleStatementReturnExpression } from "../support/singleStatementReturnExpression.js"
import { unwrapExpression } from "../support/unwrapExpression.js"
import { symbolDeclaredInEffectPackage } from "../support/declarationInEffectPackage.js"
import { strictEqual } from "../equivalence.js"
import type { EffectfulFunctionDeclaration } from "./effectfulFunctionDeclaration.js"

// PreferEffectfulFunctionFact exists because its fields form one stable data contract used by the linter.
export const PreferEffectfulFunctionFact = Schema.Struct({
  functionName: Schema.String
})

export interface PreferEffectfulFunctionFact extends Schema.Schema.Type<
  typeof PreferEffectfulFunctionFact
> {}

const expressionFromBody = (body: ts.ConciseBody) =>
  ts.isBlock(body) ? singleStatementReturnExpression(body) : Option.some(body)

const functionResult = (scan: FunctionDefinition) =>
  pipe(Option.fromNullishOr(scan.body), Option.flatMap(expressionFromBody))

const calleeName = (expression: ts.LeftHandSideExpression): Option.Option<ts.Node> => {
  const unwrapped = unwrapExpression(expression)

  if (ts.isIdentifier(unwrapped)) {
    return Option.some(unwrapped)
  }

  return pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
    Option.map(Struct.get("name"))
  )
}

const functionDefinition = (
  declaration: EffectfulFunctionDeclaration
): Option.Option<FunctionDefinition> =>
  ts.isVariableDeclaration(declaration)
    ? functionInitializer(declaration)
    : Option.some(declaration)

const callExpressionCalleeName = (call: ts.CallExpression) => calleeName(call.expression)

const variableDeclarationType = Function.flow(
  Struct.get<ts.VariableDeclaration, "type">("type"),
  Option.fromNullishOr
)

const isEffectRunSyncCall =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): boolean => {
    const symbolIsEverySync = (symbol: ts.Symbol) => {
      const nameMatches = strictEqual("runSync")(symbol.name)
      const fromEffect = symbolDeclaredInEffectPackage(symbol)
      const conditions = Array.make(nameMatches, fromEffect)

      return Array.every(conditions, Boolean)
    }

    return pipe(
      unwrapExpression(expression),
      Option.liftPredicate(ts.isCallExpression),
      Option.flatMap(callExpressionCalleeName),
      Option.flatMap(resolvedSymbolAt(checker)),
      Option.exists(symbolIsEverySync)
    )
  }

const effectfulFunctionMatches = (context: MatchContext) => {
  const runSyncResult = isEffectRunSyncCall(context.checker)

  const matches = (declaration: EffectfulFunctionDeclaration) => {
    const declaredType = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(declaration),
      Option.flatMap(variableDeclarationType)
    )

    const hasExplicitFunctionContract = Option.isSome(declaredType)
    if (hasExplicitFunctionContract) {
      return Array.empty()
    }

    const name = pipe(Option.fromNullishOr(declaration.name), Option.filter(ts.isIdentifier))
    const scan = functionDefinition(declaration)

    const candidateForRunSync = Option.gen(function* () {
      const functionDefinitionValue = yield* scan
      const functionNameNode = yield* name
      const functionName = functionNameNode.getText(context.sourceFile)

      return yield* pipe(
        functionResult(functionDefinitionValue),
        Option.filter(runSyncResult),
        Option.map(() => {
          const fact = PreferEffectfulFunctionFact.make({ functionName })
          return makeNodeMatch(functionNameNode, fact)
        })
      )
    })

    return Option.toArray(candidateForRunSync)
  }

  return matches
}

const functionDeclarationKinds = Array.make(
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.FunctionDeclaration
)

const isEffectfulFunctionDeclaration = (node: ts.Node): node is EffectfulFunctionDeclaration => {
  const isVariable = ts.isVariableDeclaration(node)
  const isFunction = ts.isFunctionDeclaration(node)
  const declarationKinds = Array.make(isVariable, isFunction)

  return Array.some(declarationKinds, Boolean)
}

export const preferEffectfulFunctionScanner = makeNodeScanner(functionDeclarationKinds)(
  isEffectfulFunctionDeclaration
)(effectfulFunctionMatches)
