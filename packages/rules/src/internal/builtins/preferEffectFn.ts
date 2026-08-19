import { Array, Function, Match, Option, pipe, Struct, flow, Schema } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { functionInitializer } from "../support/functionInitializer2.js"
import { hasParameters } from "../support/hasParameters.js"
import { unwrapExpression } from "../support/unwrapExpression.js"
import { symbolDeclaredInEffectPackage } from "../support/declarationInEffectPackage.js"
import { isEffectInterfaceSymbol } from "../support/isEffectInterfaceSymbol.js"
import { strictEqual } from "../equivalence.js"
import { returnedExpression } from "../support/returnedExpression.js"

const optionalText = Schema.optional(Schema.String)

// PreferEffectFnFact records Effect.fn candidates because self and this bindings need quotes.
export const PreferEffectFnFact = Schema.Struct({
  functionName: Schema.String,
  selfBindingText: optionalText,
  thisTypeText: optionalText
})

export interface PreferEffectFnFact extends Schema.Schema.Type<typeof PreferEffectFnFact> {}

const isGenPropertyName = (access: ts.PropertyAccessExpression) =>
  strictEqual("gen")(access.name.text)

const isEffectGenAccess = (checker: ts.TypeChecker) => (access: ts.PropertyAccessExpression) =>
  isGenPropertyName(access) &&
  pipe(
    checker.getSymbolAtLocation(access.name),
    Option.fromNullishOr,
    Option.exists(symbolDeclaredInEffectPackage)
  )

const effectGenCall =
  (checker: ts.TypeChecker) => (initializer: ts.ArrowFunction | ts.FunctionExpression) => {
    const conciseBody = !ts.isBlock(initializer.body)

    const hasSingleStatement = (body: ts.Block) =>
      pipe(body.statements, Array.length, strictEqual(1))

    const singleStatementBlock = pipe(
      Option.liftPredicate(ts.isBlock)(initializer.body),
      Option.exists(hasSingleStatement)
    )

    const supportedBodyKinds = Array.make(conciseBody, singleStatementBlock)
    const hasSingleBlockStatement = Array.some(supportedBodyKinds, Boolean)

    const callIsEffectGen = (call: ts.CallExpression) =>
      pipe(
        Option.liftPredicate(ts.isPropertyAccessExpression)(call.expression),
        Option.exists(isEffectGenAccess(checker))
      )

    if (!hasSingleBlockStatement) {
      return Option.none<ts.CallExpression>()
    }

    return pipe(
      returnedExpression(initializer),
      Option.map(unwrapExpression),
      Option.filter(ts.isCallExpression),
      Option.filter(callIsEffectGen)
    )
  }

const shorthandNameIsSelf = (shorthand: ts.ShorthandPropertyAssignment) =>
  strictEqual("self")(shorthand.name.text)

const identifierTextIsSelf = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("self"))

const stringLiteralTextIsSelf = flow(
  Struct.get<ts.StringLiteralLike, "text">("text"),
  strictEqual("self")
)

const assignmentNameIsSelf = (assignment: ts.PropertyAssignment) =>
  pipe(
    Match.value(assignment.name),
    Match.when(ts.isIdentifier, identifierTextIsSelf),
    Match.when(ts.isStringLiteralLike, stringLiteralTextIsSelf),
    Match.orElse(Function.constFalse)
  )

const propertyBindsSelf = (property: ts.ObjectLiteralElementLike) =>
  pipe(
    Match.value(property),
    Match.when(ts.isShorthandPropertyAssignment, shorthandNameIsSelf),
    Match.when(ts.isPropertyAssignment, assignmentNameIsSelf),
    Match.orElse(Function.constFalse)
  )

const objectLiteralBindsSelf = (literal: ts.ObjectLiteralExpression) =>
  Array.some(literal.properties, propertyBindsSelf)

const selfBindingLiteral = (call: ts.CallExpression) =>
  pipe(
    Option.fromNullishOr(call.arguments[0]),
    Option.filter(ts.isObjectLiteralExpression),
    Option.filter(objectLiteralBindsSelf)
  )

const identifierTextIsThis = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("this"))

const parameterIsThis = (parameter: ts.ParameterDeclaration) =>
  pipe(Option.liftPredicate(ts.isIdentifier)(parameter.name), Option.exists(identifierTextIsThis))

const generatorThisParameter = (generator: ts.FunctionExpression) =>
  Array.findFirst(generator.parameters, parameterIsThis)

const parameterTypeNode = Function.flow(
  Struct.get<ts.ParameterDeclaration, "type">("type"),
  Option.fromNullishOr
)

const generatorThisTypeText = (sourceFile: ts.SourceFile) => (call: ts.CallExpression) =>
  pipe(
    Array.findFirst(call.arguments, ts.isFunctionExpression),
    Option.flatMap(generatorThisParameter),
    Option.flatMap(parameterTypeNode),
    Option.map((typeNode) => typeNode.getText(sourceFile)),
    Option.getOrUndefined
  )

const effectFnMatches = (context: MatchContext) => {
  const genCall = effectGenCall(context.checker)

  const signatureReturnsEffect = (signature: ts.Signature) => {
    const returnType = context.checker.getReturnTypeOfSignature(signature)
    const typeSymbol = returnType.getSymbol()
    const symbol = Option.fromNullishOr(typeSymbol)

    return Option.exists(symbol, isEffectInterfaceSymbol)
  }

  const initializerReturnsEffect = (initializer: ts.ArrowFunction | ts.FunctionExpression) => {
    const declaredSignature = context.checker.getSignatureFromDeclaration(initializer)
    const signature = Option.fromNullishOr(declaredSignature)

    return Option.exists(signature, signatureReturnsEffect)
  }

  const matches = (declaration: ts.VariableDeclaration) => {
    const candidateForGenCall = (call: ts.CallExpression) => {
      const functionName = declaration.name.getText(context.sourceFile)

      const selfBinding = pipe(
        selfBindingLiteral(call),
        Option.map((literal) => literal.getText(context.sourceFile))
      )

      const selfBindingText = Option.getOrUndefined(selfBinding)

      const thisTypeText = Option.isSome(selfBinding)
        ? generatorThisTypeText(context.sourceFile)(call)
        : undefined

      const fact = PreferEffectFnFact.make({
        functionName,
        selfBindingText,
        thisTypeText
      })

      return makeNodeMatch(declaration.name, fact)
    }

    return pipe(
      functionInitializer(declaration),
      Option.filter(hasParameters),
      Option.filter(initializerReturnsEffect),
      Option.flatMap(genCall),
      Option.map(candidateForGenCall),
      Option.toArray
    )
  }

  return matches
}

const variableDeclarationKinds = Array.of(ts.SyntaxKind.VariableDeclaration)

export const preferEffectFnScanner = makeNodeScanner(variableDeclarationKinds)(
  ts.isVariableDeclaration
)(effectFnMatches)
