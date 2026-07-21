import { Array, Function, Option, pipe, Struct, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"
import { isCompositionRoot } from "../support/compositionRoot.js"
import {
  functionInitializer,
  resolvedSymbolAt,
  singleStatementReturnExpression,
  unwrapExpression,
  type FunctionDefinition
} from "../support/tsNode.js"
import { symbolDeclaredInEffectPackage } from "../support/tsSignature.js"
import { strictEqual } from "../equivalence.js"

// PreferEffectfulFunctionFact names the Effectful function because guidance quotes it.
export const PreferEffectfulFunctionFact = Schema.Struct({
  functionName: Schema.String
})

export interface PreferEffectfulFunctionFact extends Schema.Schema.Type<
  typeof PreferEffectfulFunctionFact
> {}

// EffectfulFunctionDeclaration is a local syntax union because matchers narrow one node shape.
type EffectfulFunctionDeclaration = ts.VariableDeclaration | ts.FunctionDeclaration

const expressionFromBody = (body: ts.ConciseBody) =>
  ts.isBlock(body) ? singleStatementReturnExpression(body) : Option.some(body)

const functionResult = (definition: FunctionDefinition) =>
  pipe(Option.fromNullishOr(definition.body), Option.flatMap(expressionFromBody))

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
  const fromCompositionRoot = isCompositionRoot(context.sourceFile)

  const matches = (declaration: EffectfulFunctionDeclaration) => {
    const declaredType = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(declaration),
      Option.flatMap(variableDeclarationType)
    )

    const hasExplicitFunctionContract = Option.isSome(declaredType)
    const ignoreConditions = Array.make(fromCompositionRoot, hasExplicitFunctionContract)

    if (Array.some(ignoreConditions, Boolean)) {
      return Array.empty()
    }

    const name = pipe(Option.fromNullishOr(declaration.name), Option.filter(ts.isIdentifier))
    const definition = functionDefinition(declaration)

    const detectionForRunSync = Option.gen(function* () {
      const functionDefinitionValue = yield* definition
      const functionNameNode = yield* name
      const functionName = functionNameNode.getText(context.sourceFile)

      return yield* pipe(
        functionResult(functionDefinitionValue),
        Option.filter(runSyncResult),
        Option.map(() => {
          const fact = PreferEffectfulFunctionFact.make({ functionName })
          return nodeMatch(functionNameNode, fact)
        })
      )
    })

    return Option.toArray(detectionForRunSync)
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

export const preferEffectfulFunctionMatcher = nodeMatcher(functionDeclarationKinds)(
  isEffectfulFunctionDeclaration
)(effectfulFunctionMatches)
