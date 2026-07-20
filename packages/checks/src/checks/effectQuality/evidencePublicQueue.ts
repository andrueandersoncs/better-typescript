import { Array, Function, Match, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { ArchitectureRole } from "../support/architectureRole.js"
import { hasExportModifier } from "../support/tsNode.js"
import { ancestorMatching, declarationNameText } from "./astQueries.js"
import { isTestRole } from "./architectureRoles.js"
import { emptyAdviceFindings, makeAdviceFinding } from "./makeFindings.js"
import type { EffectQualityAdviceFinding } from "./findings.js"
import { apiSubject, callIsEffectApi, isProductionRole } from "./evidenceSupport.js"

const queueConstructorNames = Array.make("make", "bounded", "unbounded", "dropping", "sliding")

const pubSubConstructorNames = Array.make(
  "make",
  "bounded",
  "unbounded",
  "dropping",
  "sliding",
  "makeAtomicBounded",
  "makeAtomicUnbounded"
)

const subscriptionRefConstructorNames = Array.of("make")

const isDirectExportStatement = (node: ts.Node): node is ts.Statement => {
  const variableStatement = ts.isVariableStatement(node)
  const functionDeclaration = ts.isFunctionDeclaration(node)
  const classDeclaration = ts.isClassDeclaration(node)
  const interfaceDeclaration = ts.isInterfaceDeclaration(node)
  const typeAliasDeclaration = ts.isTypeAliasDeclaration(node)

  const kinds = Array.make(
    variableStatement,
    functionDeclaration,
    classDeclaration,
    interfaceDeclaration,
    typeAliasDeclaration
  )

  return Array.some(kinds, Boolean)
}

const isExportedDeclaration = (node: ts.Node) =>
  isDirectExportStatement(node)
    ? hasExportModifier(node)
    : pipe(ancestorMatching(ts.isVariableStatement)(node), Option.exists(hasExportModifier))

const queueFamilyNames = Array.make("Queue", "PubSub", "SubscriptionRef", "Dequeue", "Enqueue")

const identifierIsQueueFamily = (identifier: ts.Identifier) =>
  Array.contains(queueFamilyNames, identifier.text)

const typeReferenceIsQueueFamily = (reference: ts.TypeReferenceNode) =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(reference.typeName),
    Option.exists(identifierIsQueueFamily)
  )

const matchQueueFamilyNode = (current: ts.Node) =>
  pipe(
    Match.value(current),
    Match.when(ts.isIdentifier, identifierIsQueueFamily),
    Match.when(ts.isTypeReferenceNode, typeReferenceIsQueueFamily),
    Match.orElse(Function.constFalse)
  )

const typeNodeReferencesQueueFamily = (typeNode: ts.TypeNode) => {
  const reducer = (found: boolean, current: ts.Node) => {
    const matchesQueueFamily = matchQueueFamilyNode(current)
    const signals = Array.make(found, matchesQueueFamily)

    return Array.some(signals, Boolean)
  }

  return foldAst(reducer)(typeNode)(false)
}

const queueConstructorSignals = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const queue = callIsEffectApi(checker)("Queue")(queueConstructorNames)(call)
  const pubsub = callIsEffectApi(checker)("PubSub")(pubSubConstructorNames)(call)

  const subscriptionRef = callIsEffectApi(checker)("SubscriptionRef")(
    subscriptionRefConstructorNames
  )(call)

  return Array.make(queue, pubsub, subscriptionRef)
}

const exportedCallQueueFindings = (context: CheckContext) => (node: ts.CallExpression) => {
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
  (context: CheckContext) => (node: ts.VariableDeclaration) =>
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
  (context: CheckContext) =>
  (role: ArchitectureRole) =>
  (node: ts.Node): ReadonlyArray<EffectQualityAdviceFinding> => {
    // Ports already forbid infrastructure contracts via FCE because other public surfaces need advice.
    const isPort = role === "port"
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

    // Exported type annotations expose queue family handles because callers couple to infrastructure.
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
