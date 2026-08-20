import { Function, Match, Option, Schema, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { functionReturnsEffectGen } from "../../internal/builtins/effectGenReturningFunction.js"
import { functionDefinitionKinds } from "../../internal/builtins/functionDefinitionKinds.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import type { FunctionDefinition } from "../../internal/support/functionDefinition.js"
import { isFunctionDefinition } from "../../internal/support/isFunctionDefinition.js"
import { propertyNameText } from "../../internal/support/propertyNameText.js"

// PreferEffectFnFact exists because the scanner and message share a dynamic function name.
export const PreferEffectFnFact = Schema.Struct({
  functionName: Schema.String
})

export interface PreferEffectFnFact extends Schema.Schema.Type<typeof PreferEffectFnFact> {}

const declarationNameNode = flow(
  Struct.get<ts.VariableDeclaration | ts.PropertyAssignment | ts.PropertyDeclaration, "name">(
    "name"
  ),
  Option.some<ts.Node>
)

const contextualNameNode = (declaration: FunctionDefinition) =>
  pipe(
    Match.value(declaration.parent),
    Match.when(ts.isVariableDeclaration, declarationNameNode),
    Match.when(ts.isPropertyAssignment, declarationNameNode),
    Match.when(ts.isPropertyDeclaration, declarationNameNode),
    Match.orElse(Option.none as () => Option.Option<ts.Node>)
  )

const functionDeclarationNameNode = (declaration: ts.FunctionDeclaration) =>
  pipe(
    declaration.name,
    Option.fromNullishOr,
    Option.map((name): ts.Node => name)
  )

const functionExpressionNameNode = (expression: ts.FunctionExpression) =>
  pipe(
    expression.name,
    Option.fromNullishOr,
    Option.map((name): ts.Node => name)
  )

const methodName = (method: ts.MethodDeclaration): Option.Option<ts.Node> =>
  Option.some(method.name)

const ownNameNode = (declaration: FunctionDefinition) =>
  pipe(
    Match.value(declaration),
    Match.when(ts.isFunctionDeclaration, functionDeclarationNameNode),
    Match.when(ts.isFunctionExpression, functionExpressionNameNode),
    Match.when(ts.isMethodDeclaration, methodName),
    Match.orElse(Option.none as () => Option.Option<ts.Node>)
  )

const functionNameNode = (declaration: FunctionDefinition) =>
  pipe(
    contextualNameNode(declaration),
    Option.orElse(() => ownNameNode(declaration))
  )

const nodeText = (sourceFile: ts.SourceFile) => (node: ts.Node) => node.getText(sourceFile)

const nameNodeText = (sourceFile: ts.SourceFile) => (node: ts.Node) =>
  pipe(
    Match.value(node),
    Match.when(ts.isPropertyName, propertyNameText),
    Match.orElse(flow(nodeText(sourceFile), Option.some))
  )

const functionNameText = (sourceFile: ts.SourceFile) => (declaration: FunctionDefinition) =>
  pipe(
    functionNameNode(declaration),
    Option.flatMap(nameNodeText(sourceFile)),
    Option.getOrElse(Function.constant("this function"))
  )

const preferEffectFnMatches = (context: MatchContext) => (declaration: FunctionDefinition) =>
  pipe(
    functionReturnsEffectGen(context.checker)(declaration),
    Option.map(() => {
      const functionName = functionNameText(context.sourceFile)(declaration)

      const targetNode = pipe(
        functionNameNode(declaration),
        Option.getOrElse(Function.constant<ts.Node>(declaration))
      )

      const fact = PreferEffectFnFact.make({ functionName })

      return makeNodeMatch(targetNode, fact)
    }),
    Option.toArray
  )

export const preferEffectFnScanner =
  makeNodeScanner(functionDefinitionKinds)(isFunctionDefinition)(preferEffectFnMatches)
