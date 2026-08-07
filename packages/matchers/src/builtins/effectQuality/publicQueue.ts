import { Array, Function, Option, Struct, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import type { MatchContext } from "../../matcher/matchContext.js"

import { foldAst } from "../../sources/foldAst.js"

import type { ArchitectureRole } from "../../support/architectureRoleType.js"

import { hasExportModifier } from "../../support/hasExportModifier.js"

import { apiSubject } from "./apiSubject.js"

import { declarationNameText } from "./declarationNameText.js"

import { EffectQualityAdviceFinding } from "./effectQualityAdviceFinding.js"

import { emptyAdviceFindings } from "./emptyAdviceFindings.js"

import { isExportedDeclaration } from "./isDirectExportStatement.js"

import { isTestRole } from "./isTestRole.js"

import { makeAdviceFinding } from "./makeAdviceFinding.js"

import { isProductionRole } from "./productionRoles.js"

import { queueConstructorSignals } from "./queueConstructorNames.js"

import { typeNodeReferencesQueueFamily } from "./typeReferenceIsQueueFamily.js"

const exportedCallQueueFindings = (context: MatchContext) => (node: ts.CallExpression) => {
  const constructors = queueConstructorSignals(context.checker)(node)

  if (!Array.some(constructors, Boolean)) {
    return emptyAdviceFindings
  }

  const expressionText = node.expression.getText()
  const subject = apiSubject(context)(expressionText)(node.expression)
  const finding = makeAdviceFinding("public-queue")(subject)(node.expression)

  return Array.of(finding)
}

const exportedVariableTypeFindings = (node: ts.VariableDeclaration) => {
  const typeNodeOption = Option.fromNullishOr(node.type)
  const referencesQueue = pipe(typeNodeOption, Option.exists(typeNodeReferencesQueueFamily))

  if (!referencesQueue) {
    return emptyAdviceFindings
  }

  const typeNode = pipe(typeNodeOption, Option.getOrThrow)
  const typeText = typeNode.getText()

  const subject = pipe(
    Option.liftPredicate(ts.isIdentifier)(node.name),
    Option.map(Struct.get("text")),
    Option.getOrElse(Function.constant(typeText))
  )

  const finding = makeAdviceFinding("public-queue")(subject)(typeNode)

  return Array.of(finding)
}

const exportedVariableInitializerFindings =
  (context: MatchContext) => (node: ts.VariableDeclaration) =>
    pipe(
      Option.fromNullishOr(node.initializer),
      Option.filter(ts.isCallExpression),
      Option.flatMap((initializer) => {
        const constructors = queueConstructorSignals(context.checker)(initializer)
        const exported = isExportedDeclaration(node)
        const hasConstructor = Array.some(constructors, Boolean)
        const emitParts = Array.make(hasConstructor, exported)
        const emit = Array.every(emitParts, Boolean)

        if (!emit) {
          return Option.none()
        }

        const expressionText = initializer.expression.getText()
        const subject = apiSubject(context)(expressionText)(initializer.expression)
        const finding = makeAdviceFinding("public-queue")(subject)(initializer.expression)
        const findings = Array.of(finding)

        return Option.some(findings)
      }),
      Option.getOrElse(Function.constant(emptyAdviceFindings))
    )

const isExportedTypeSurface = (node: ts.Node) => {
  const typeAlias = ts.isTypeAliasDeclaration(node)
  const interfaceDeclaration = ts.isInterfaceDeclaration(node)
  const typeSurface = Array.make(typeAlias, interfaceDeclaration)
  const isTypeSurface = Array.some(typeSurface, Boolean)

  return isTypeSurface ? hasExportModifier(node as ts.Statement) : isTypeSurface
}

const exportedTypeSurfaceFindings = (node: ts.Node) => {
  const matchCurrent = (current: ts.Node) => {
    const isType = ts.isTypeNode(current)

    return isType ? typeNodeReferencesQueueFamily(current) : isType
  }

  const referencesQueueReducer = (found: boolean, current: ts.Node) => {
    const matchesCurrent = matchCurrent(current)
    const signals = Array.make(found, matchesCurrent)

    return Array.some(signals, Boolean)
  }

  const referencesQueue = foldAst(referencesQueueReducer)(node)(false)

  if (!referencesQueue) {
    return emptyAdviceFindings
  }

  const nodeText = node.getText()

  const namedDeclaration = pipe(
    Option.liftPredicate(ts.isTypeAliasDeclaration)(node),
    Option.orElse(() => Option.liftPredicate(ts.isInterfaceDeclaration)(node))
  )

  const subject = pipe(
    namedDeclaration,
    Option.flatMap(declarationNameText),
    Option.getOrElse(Function.constant(nodeText))
  )

  const finding = makeAdviceFinding("public-queue")(subject)(node)

  return Array.of(finding)
}

export const publicQueue =
  (context: MatchContext) =>
  (role: ArchitectureRole) =>
  (node: ts.Node): ReadonlyArray<EffectQualityAdviceFinding> => {
    // Ports already forbid infrastructure contracts via because other public surfaces need advice.
    const isPort = strictEqual("port")(role)
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    const skipRoles = Array.make(isPort, testRole, nonProduction)

    if (Array.some(skipRoles, Boolean)) {
      return emptyAdviceFindings
    }

    const exportedCallFindings = pipe(
      Option.liftPredicate(ts.isCallExpression)(node),
      Option.filter(isExportedDeclaration),
      Option.map(exportedCallQueueFindings(context)),
      Option.getOrElse(Function.constant(emptyAdviceFindings))
    )

    if (exportedCallFindings.length > 0) {
      return exportedCallFindings
    }

    // Exported type annotations expose queue family because callers couple to infrastructure.
    const exportedVariableFindings = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(node),
      Option.filter(isExportedDeclaration),
      Option.map((variable) => {
        const typeFindings = exportedVariableTypeFindings(variable)

        return typeFindings.length > 0
          ? typeFindings
          : exportedVariableInitializerFindings(context)(variable)
      }),
      Option.getOrElse(Function.constant(emptyAdviceFindings))
    )

    if (exportedVariableFindings.length > 0) {
      return exportedVariableFindings
    }

    return isExportedTypeSurface(node) ? exportedTypeSurfaceFindings(node) : emptyAdviceFindings
  }
