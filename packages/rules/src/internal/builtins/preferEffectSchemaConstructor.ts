import { Array, Option, Predicate, pipe } from "effect"
import * as ts from "typescript"
import type { MatchContext } from "../scanner/matchContext.js"
import { nodeScanner } from "../scanner/nodeScanner.js"
import { isReturnedExpressionNode } from "../support/isReturnedExpressionNode.js"
import { isFirstPartySymbol } from "../support/isFirstPartySymbol.js"
import { propertyNameText } from "../support/propertyNameText.js"
import { branchExpressions } from "./preferEffectSchemaConstructorBranchExpressions.js"
import { makePreferEffectSchemaConstructorMatch } from "./preferEffectSchemaConstructorFact.js"
import { isNonEmptyObjectLiteral } from "./preferEffectSchemaConstructorObjectLiteral.js"
import { typeSymbol } from "./typeSymbol.js"

const signatureReturnType = (context: MatchContext) => (declaration: ts.SignatureDeclaration) =>
  pipe(
    context.checker.getSignatureFromDeclaration(declaration),
    Option.fromNullishOr,
    Option.map(context.checker.getReturnTypeOfSignature.bind(context.checker))
  )

const contextualCallableReturnType =
  (context: MatchContext) => (declaration: ts.SignatureDeclaration) => {
    const isArrow = ts.isArrowFunction(declaration)
    const isFunctionExpression = ts.isFunctionExpression(declaration)
    const isContextualFunction = isArrow || isFunctionExpression

    if (!isContextualFunction) return Option.none<ts.Type>()

    const signaturesOfType = (type: ts.Type) =>
      context.checker.getSignaturesOfType(type, ts.SignatureKind.Call)

    return pipe(
      context.checker.getContextualType(declaration as ts.ArrowFunction | ts.FunctionExpression),
      Option.fromNullishOr,
      Option.map(signaturesOfType),
      Option.flatMap(Array.head),
      Option.map(context.checker.getReturnTypeOfSignature.bind(context.checker))
    )
  }

const contextualMethodReturnType =
  (context: MatchContext) => (declaration: ts.SignatureDeclaration) =>
    Option.gen(function* () {
      const method = yield* Option.liftPredicate(ts.isMethodDeclaration)(declaration)
      const object = yield* pipe(method.parent, Option.liftPredicate(ts.isObjectLiteralExpression))

      const objectType = yield* pipe(
        context.checker.getContextualType(object),
        Option.fromNullishOr
      )

      const propertyName = yield* propertyNameText(method.name)

      const property = yield* pipe(
        context.checker.getPropertyOfType(objectType, propertyName),
        Option.fromNullishOr
      )

      const propertyType = context.checker.getTypeOfSymbolAtLocation(property, method)

      const signature = yield* pipe(
        context.checker.getSignaturesOfType(propertyType, ts.SignatureKind.Call),
        Array.head
      )

      return context.checker.getReturnTypeOfSignature(signature)
    })

const contextualReturnType = (context: MatchContext) => (declaration: ts.SignatureDeclaration) =>
  pipe(
    contextualCallableReturnType(context)(declaration),
    Option.orElse(() => contextualMethodReturnType(context)(declaration))
  )

const returnTypeForDeclaration =
  (context: MatchContext) => (declaration: ts.SignatureDeclaration) =>
    pipe(
      contextualReturnType(context)(declaration),
      Option.orElse(() => signatureReturnType(context)(declaration))
    )

const functionReturnType = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    ts.findAncestor(node, ts.isFunctionLike),
    Option.fromNullishOr,
    Option.flatMap(returnTypeForDeclaration(context))
  )

const sourceFileOf = (declaration: ts.Declaration) => declaration.getSourceFile()

const isDefaultLibrarySymbol = (context: MatchContext) => (symbol: ts.Symbol) => {
  const declarations = symbol.getDeclarations() ?? Array.empty()
  const sourceFiles = Array.map(declarations, sourceFileOf)

  return Array.some(sourceFiles, context.program.isSourceFileDefaultLibrary.bind(context.program))
}

const typeArguments = (context: MatchContext) => (type: ts.Type) => {
  const isObject = (type.flags & ts.TypeFlags.Object) !== 0
  const hasReferenceFlag = ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) !== 0
  const referenceChecks = Array.make(isObject, hasReferenceFlag)
  const isReference = Array.every(referenceChecks, Boolean)

  return isReference
    ? context.checker.getTypeArguments(type as ts.TypeReference)
    : Array.empty<ts.Type>()
}

const hasForeignContractType =
  (context: MatchContext) =>
  (type: ts.Type): boolean => {
    if (type.isUnionOrIntersection()) {
      return Array.some(type.types, hasForeignContractType(context))
    }

    const symbol = typeSymbol(type)
    const argumentsList = typeArguments(context)(type)
    const unwrapDefaultContainer = pipe(symbol, Option.exists(isDefaultLibrarySymbol(context)))
    const hasTypeArguments = Array.isReadonlyArrayNonEmpty(argumentsList)
    const containerChecks = Array.make(unwrapDefaultContainer, hasTypeArguments)
    const shouldUnwrapContainer = Array.every(containerChecks, Boolean)
    const foreignContainerMember = Array.some(argumentsList, hasForeignContractType(context))
    const foreignSymbol = pipe(symbol, Option.exists(Predicate.not(isFirstPartySymbol)))

    return shouldUnwrapContainer ? foreignContainerMember : foreignSymbol
  }

const hasForeignReturnContract = (context: MatchContext) => (node: ts.Node) =>
  pipe(functionReturnType(context)(node), Option.exists(hasForeignContractType(context)))

const objectLiteralReturnMatches = (context: MatchContext) => {
  const matches = (node: ts.Node) => {
    if (!isReturnedExpressionNode(node)) return Array.empty()

    const expression = ts.isReturnStatement(node)
      ? Option.fromNullishOr(node.expression)
      : Option.liftPredicate(ts.isExpression)((node as ts.ArrowFunction).body)

    return pipe(
      expression,
      Option.toArray,
      Array.flatMap(branchExpressions),
      Array.filter(ts.isObjectLiteralExpression),
      Array.filter(isNonEmptyObjectLiteral),
      Array.filter(Predicate.not(hasForeignReturnContract(context))),
      Array.map(makePreferEffectSchemaConstructorMatch)
    )
  }

  return matches
}

const isFunctionLocal = (node: ts.VariableDeclaration) =>
  pipe(ts.findAncestor(node, ts.isFunctionLike), Option.fromNullishOr, Option.isSome)

const objectLiteralDeclarationMatches = (node: ts.VariableDeclaration) => {
  if (!isFunctionLocal(node)) return Array.empty()

  return pipe(
    Option.fromNullishOr(node.initializer),
    Option.toArray,
    Array.flatMap(branchExpressions),
    Array.filter(ts.isObjectLiteralExpression),
    Array.filter(isNonEmptyObjectLiteral),
    Array.map(makePreferEffectSchemaConstructorMatch)
  )
}

const candidateKinds = Array.make(
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.VariableDeclaration
)

const isCandidate = (
  node: ts.Node
): node is ts.ReturnStatement | ts.ArrowFunction | ts.VariableDeclaration =>
  isReturnedExpressionNode(node) || ts.isVariableDeclaration(node)

const matchCandidate = (context: MatchContext) => (node: ts.Node) =>
  ts.isVariableDeclaration(node)
    ? objectLiteralDeclarationMatches(node)
    : objectLiteralReturnMatches(context)(node)

export const preferEffectSchemaConstructorScanner =
  nodeScanner(candidateKinds)(isCandidate)(matchCandidate)
