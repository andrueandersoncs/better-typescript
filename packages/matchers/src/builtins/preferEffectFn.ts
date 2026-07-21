import { Array, Function, Match, Option, pipe, Struct, flow, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"
import {
  functionInitializer,
  hasParameters,
  returnStatementExpression,
  unwrapExpression
} from "../support/tsNode.js"
import { isEffectInterfaceSymbol, symbolDeclaredInEffectPackage } from "../support/tsSignature.js"
import { strictEqual } from "../equivalence.js"

const optionalText = Schema.optional(Schema.String)

// PreferEffectFnFact records Effect.fn candidates because self and this bindings need quotes.
export const PreferEffectFnFact = Schema.Struct({
  functionName: Schema.String,
  selfBindingText: optionalText,
  thisTypeText: optionalText
})

export interface PreferEffectFnFact extends Schema.Schema.Type<typeof PreferEffectFnFact> {}

const singleBlockStatement = (block: ts.Block): Option.Option<ts.Statement> =>
  strictEqual(1)(block.statements.length)
    ? Option.fromNullishOr(block.statements[0])
    : Option.none()

const isGenPropertyName = (access: ts.PropertyAccessExpression) =>
  strictEqual("gen")(access.name.text)

const returnedExpression = (initializer: ts.ArrowFunction | ts.FunctionExpression) => {
  const body = initializer.body

  const blockResult = pipe(
    Option.liftPredicate(ts.isBlock)(body),
    Option.flatMap(singleBlockStatement),
    Option.filter(ts.isReturnStatement),
    Option.flatMap(returnStatementExpression)
  )

  const conciseResult = ts.isBlock(body) ? Option.none() : Option.some(body)

  return Option.orElse(blockResult, Function.constant(conciseResult))
}

const isEffectGenAccess = (checker: ts.TypeChecker) => (access: ts.PropertyAccessExpression) =>
  isGenPropertyName(access) &&
  pipe(
    checker.getSymbolAtLocation(access.name),
    Option.fromNullishOr,
    Option.exists(symbolDeclaredInEffectPackage)
  )

const effectGenCall =
  (checker: ts.TypeChecker) => (initializer: ts.ArrowFunction | ts.FunctionExpression) => {
    const callIsEffectGen = (call: ts.CallExpression) =>
      pipe(
        Option.liftPredicate(ts.isPropertyAccessExpression)(call.expression),
        Option.exists(isEffectGenAccess(checker))
      )

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
  const checker = context.checker
  const sourceFile = context.sourceFile
  const genCall = effectGenCall(checker)

  const signatureReturnsEffect = (signature: ts.Signature) => {
    const returnType = checker.getReturnTypeOfSignature(signature)
    const typeSymbol = returnType.getSymbol()
    const symbol = Option.fromNullishOr(typeSymbol)

    return Option.exists(symbol, isEffectInterfaceSymbol)
  }

  const initializerReturnsEffect = (initializer: ts.ArrowFunction | ts.FunctionExpression) => {
    const declaredSignature = checker.getSignatureFromDeclaration(initializer)
    const signature = Option.fromNullishOr(declaredSignature)

    return Option.exists(signature, signatureReturnsEffect)
  }

  const matches = (declaration: ts.VariableDeclaration) => {
    const detectionForGenCall = (call: ts.CallExpression) => {
      const functionName = declaration.name.getText(sourceFile)

      const selfBinding = pipe(
        selfBindingLiteral(call),
        Option.map((literal) => literal.getText(sourceFile))
      )

      const selfBindingText = Option.getOrUndefined(selfBinding)

      const thisTypeText = Option.isSome(selfBinding)
        ? generatorThisTypeText(sourceFile)(call)
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
      Option.map(detectionForGenCall),
      Option.toArray
    )
  }

  return matches
}

const variableDeclarationKinds = Array.of(ts.SyntaxKind.VariableDeclaration)

export const preferEffectFnMatcher = nodeMatcher(variableDeclarationKinds)(
  ts.isVariableDeclaration
)(effectFnMatches)
