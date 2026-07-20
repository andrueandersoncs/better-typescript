import { Array, Function, Match, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import {
  functionInitializer,
  hasParameters,
  returnStatementExpression,
  unwrapExpression
} from "./support/tsNode.js"
import { isEffectInterfaceSymbol, symbolDeclaredInEffectPackage } from "./support/tsSignature.js"
import { makeCheck } from "../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeDetection } from "@better-typescript/core/engine/check"

const singleBlockStatement = (block: ts.Block): Option.Option<ts.Statement> =>
  block.statements.length === 1 ? Option.fromNullishOr(block.statements[0]) : Option.none()

const isGenPropertyName = (access: ts.PropertyAccessExpression) => access.name.text === "gen"

const returnedExpression = (initializer: ts.ArrowFunction | ts.FunctionExpression) => {
  const body = initializer.body

  const blockResult = pipe(
    Option.liftPredicate(ts.isBlock)(body),
    Option.flatMap(singleBlockStatement),
    Option.filter(ts.isReturnStatement),
    Option.flatMap(returnStatementExpression)
  )

  const conciseResult = ts.isBlock(body) ? Option.none<ts.Expression>() : Option.some(body)

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
  shorthand.name.text === "self"

const identifierTextIsSelf = (name: ts.Identifier) => name.text === "self"

const stringLiteralTextIsSelf = (name: ts.StringLiteralLike) => name.text === "self"

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

const identifierTextIsThis = (name: ts.Identifier) => name.text === "this"

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
    Option.getOrElse(Function.constant("..."))
  )

const ordinaryHint = (functionName: string) =>
  `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(function* (...) ` +
  "{ ... }): Effect.fn subsumes the Effect.gen wrapper and runs every call inside a " +
  "traced span."

const selfBoundHint =
  (sourceFile: ts.SourceFile) => (functionName: string, call: ts.CallExpression) => {
    const literalText = (literal: ts.ObjectLiteralExpression) => literal.getText(sourceFile)

    const selfBinding = pipe(
      selfBindingLiteral(call),
      Option.map(literalText),
      Option.getOrElse(Function.constant("{ self: this }"))
    )

    const thisType = generatorThisTypeText(sourceFile)(call)

    return (
      `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(${selfBinding}, ` +
      `function*(this: ${thisType}, ...) { ... }): Effect.fn subsumes the Effect.gen wrapper ` +
      "and runs every call inside a traced span."
    )
  }

const rewriteHint =
  (sourceFile: ts.SourceFile) => (functionName: string, call: ts.CallExpression) => {
    const ordinary = ordinaryHint(functionName)
    const ordinaryForFunction = Function.constant(ordinary)
    const selfBound = selfBoundHint(sourceFile)(functionName, call)
    const selfBoundForCall = Function.constant(selfBound)

    return pipe(
      selfBindingLiteral(call),
      Option.match({
        onNone: ordinaryForFunction,
        onSome: selfBoundForCall
      })
    )
  }

const effectFnMatches = (context: CheckContext) => {
  const checker = context.checker
  const sourceFile = context.sourceFile
  const match = makeDetection(context)
  const genCall = effectGenCall(checker)
  const hintFor = rewriteHint(sourceFile)

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

  const matches = (declaration: ts.VariableDeclaration): ReadonlyArray<Detection> => {
    const detectionForGenCall = (call: ts.CallExpression) => {
      const functionName = declaration.name.getText(sourceFile)
      const hint = hintFor(functionName, call)

      return match({
        node: declaration.name,
        message: `Avoid wrapping the body of ${functionName} in Effect.gen; use Effect.fn.`,
        hint
      })
    }

    return pipe(
      functionInitializer(declaration),
      Option.filter(hasParameters),
      Option.filter(initializerReturnsEffect),
      // Rewrite only Effect.gen wrappers because Effect.fn changes what plain combinator bodies build.
      Option.flatMap(genCall),
      Option.map(detectionForGenCall),
      Option.toArray
    )
  }

  return matches
}

const variableDeclarationKinds = Array.of(ts.SyntaxKind.VariableDeclaration)

export const preferEffectFn = makeCheck(
  "prefer-effect-fn",
  variableDeclarationKinds,
  ts.isVariableDeclaration,
  effectFnMatches
)
