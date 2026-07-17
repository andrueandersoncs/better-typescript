import { Array, Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { ExternalDependencyConstructionData } from "./data.js"
import { unwrapExpression } from "../support/tsNode.js"
import { isCompositionRoot } from "../support/compositionRoot.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

const message =
  "External collaborator construction evidence — behaviour creates an imported collaborator away from the composition root."

const hint =
  "Architecture Explore classifies concentrated evidence before recommending a real seam with production and test adapters."

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

const collaboratorName = (expression: ts.Expression): Option.Option<string> => {
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
    Option.flatMap((access) => constructionRootIdentifier(access.expression))
  )
}

export const importDeclarationAncestor = (node: ts.Node): Option.Option<ts.ImportDeclaration> =>
  ts.isImportDeclaration(node)
    ? Option.some(node)
    : pipe(Option.fromNullishOr(node.parent), Option.flatMap(importDeclarationAncestor))

const hasImportDeclarationAncestor = Function.compose(importDeclarationAncestor, Option.isSome)

const importedPathFor = (
  checker: ts.TypeChecker,
  expression: ts.Expression
): Option.Option<string> =>
  pipe(
    constructionRootIdentifier(expression),
    Option.flatMap((identifier) =>
      pipe(checker.getSymbolAtLocation(identifier), Option.fromNullishOr)
    ),
    Option.map((symbol) => symbol.declarations ?? Array.empty()),
    Option.flatMap(Array.findFirst(hasImportDeclarationAncestor)),
    Option.flatMap(importDeclarationAncestor),
    Option.map(Struct.get("moduleSpecifier")),
    Option.filter(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )

const isCollaboratorName = (name: string): boolean => {
  const knownName = HashSet.has(collaboratorNames, name)
  const knownSuffix = Array.some(collaboratorSuffixes, (suffix) => name.endsWith(suffix))

  return knownName || knownSuffix
}

const isDirectFactoryResult = (node: ts.NewExpression): boolean => {
  const parent = node.parent

  const returned = pipe(
    Option.liftPredicate(ts.isReturnStatement)(parent),
    Option.exists((statement) => statement.expression === node)
  )

  const conciseArrow = pipe(
    Option.liftPredicate(ts.isArrowFunction)(parent),
    Option.exists((arrow) => arrow.body === node)
  )

  return returned || conciseArrow
}

const constructionElements = (context: CheckContext) => {
  const element = detection(context)

  const handler = (node: ts.NewExpression): ReadonlyArray<Detection> => {
    const atCompositionRoot = isCompositionRoot(context.sourceFile)
    const directFactoryResult = isDirectFactoryResult(node)
    const shouldIgnore = atCompositionRoot || directFactoryResult

    if (shouldIgnore) {
      return Array.empty()
    }

    const name = collaboratorName(node.expression)
    const importedPath = importedPathFor(context.checker, node.expression)

    const evidence = pipe(
      Option.all({ name, importedPath }),
      Option.filter(({ name }) => isCollaboratorName(name))
    )

    return pipe(
      evidence,
      Option.map(({ name, importedPath }) => {
        const data = new ExternalDependencyConstructionData({
          collaboratorName: name,
          importedPath
        })

        const reported = element({
          node,
          message,
          hint,
          data
        })

        return reported
      }),
      Option.toArray
    )
  }

  return handler
}

const newExpressionKinds = Array.of(ts.SyntaxKind.NewExpression)

export const externalDependencyConstruction: Check = nodeCheck(newExpressionKinds)(
  ts.isNewExpression
)(constructionElements)
