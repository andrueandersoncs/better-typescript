import { Array, Function, HashSet, Option, Struct, pipe, flow } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { ExternalDependencyConstructionData } from "./architectureExploreData.js"
import { unwrapExpression } from "../support/tsNode.js"
import { isCompositionRoot } from "../support/compositionRoot.js"
import { nodeMatcher } from "@better-typescript/matchers/matcher"
import { nodeMatch, type Match, type MatchContext } from "@better-typescript/matchers/matcher/data"

const collaboratorSuffixes = Array.make(
  "Client",
  "Gateway",
  "Repository",
  "Service",
  "Transport",
  "Connection",
  "Pool",
  "Driver",
  "Producer",
  "Consumer",
  "Database"
)

const collaboratorNames = HashSet.make("Stripe", "Twilio")

const collaboratorName = (expression: ts.Expression) => {
  const unwrapped = unwrapExpression(expression)

  if (ts.isIdentifier(unwrapped)) {
    return Option.some(unwrapped.text)
  }

  return pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
    Option.map((access) => access.name.text)
  )
}

const constructionRootIdentifier = (expression: ts.Expression): Option.Option<ts.Identifier> => {
  const unwrapped = unwrapExpression(expression)

  if (ts.isIdentifier(unwrapped)) {
    return Option.some(unwrapped)
  }

  if (ts.isPropertyAccessExpression(unwrapped)) {
    return constructionRootIdentifier(unwrapped.expression)
  }

  return pipe(
    Option.liftPredicate(ts.isElementAccessExpression)(unwrapped),
    Option.flatMap(Function.flow(Struct.get("expression"), constructionRootIdentifier))
  )
}

export const importDeclarationAncestor = (node: ts.Node): Option.Option<ts.ImportDeclaration> =>
  ts.isImportDeclaration(node)
    ? Option.some(node)
    : pipe(Option.fromNullishOr(node.parent), Option.flatMap(importDeclarationAncestor))

const hasImportDeclarationAncestor = Function.compose(importDeclarationAncestor, Option.isSome)

const importedPathFor = (checker: ts.TypeChecker, expression: ts.Expression) => {
  const symbolFromIdentifier = (identifier: ts.Identifier) =>
    pipe(checker.getSymbolAtLocation(identifier), Option.fromNullishOr)

  return pipe(
    constructionRootIdentifier(expression),
    Option.flatMap(symbolFromIdentifier),
    Option.map((symbol) => symbol.declarations ?? Array.empty()),
    Option.flatMap(Array.findFirst(hasImportDeclarationAncestor)),
    Option.flatMap(importDeclarationAncestor),
    Option.map(Struct.get("moduleSpecifier")),
    Option.filter(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )
}

const isCollaboratorName = (name: string) => {
  const knownName = HashSet.has(collaboratorNames, name)
  const endsWithSuffix = (suffix: string) => name.endsWith(suffix)
  const knownSuffix = Array.some(collaboratorSuffixes, endsWithSuffix)

  return knownName || knownSuffix
}

const isDirectFactoryResult = (node: ts.NewExpression) => {
  const parent = node.parent

  const statementExpressionIsNode = flow(
    Struct.get<ts.ReturnStatement, "expression">("expression"),
    strictEqual(node)
  )

  const arrowBodyIsNode = flow(Struct.get<ts.ArrowFunction, "body">("body"), strictEqual(node))

  const returned = pipe(
    Option.liftPredicate(ts.isReturnStatement)(parent),
    Option.exists(statementExpressionIsNode)
  )

  const conciseArrow = pipe(
    Option.liftPredicate(ts.isArrowFunction)(parent),
    Option.exists(arrowBodyIsNode)
  )

  return returned || conciseArrow
}

const constructionElements = (context: MatchContext) => {
  const handler = (
    node: ts.NewExpression
  ): ReadonlyArray<Match<ExternalDependencyConstructionData>> => {
    const atCompositionRoot = isCompositionRoot(context.sourceFile)
    const directFactoryResult = isDirectFactoryResult(node)
    const shouldIgnore = atCompositionRoot || directFactoryResult

    if (shouldIgnore) {
      return Array.empty()
    }

    const name = collaboratorName(node.expression)
    const importedPath = importedPathFor(context.checker, node.expression)
    const collaborator = pipe(name, Option.filter(isCollaboratorName))

    return pipe(
      Option.all({ name: collaborator, importedPath }),
      Option.map(({ name, importedPath }) => {
        const data = ExternalDependencyConstructionData.make({
          collaboratorName: name,
          importedPath
        })

        const reported = nodeMatch(node, data)

        return reported
      }),
      Option.toArray
    )
  }

  return handler
}

const newExpressionKinds = Array.of(ts.SyntaxKind.NewExpression)

const externalDependencyConstructionCheck = nodeMatcher(newExpressionKinds)(ts.isNewExpression)(
  constructionElements
)

export const externalDependencyConstruction = externalDependencyConstructionCheck
