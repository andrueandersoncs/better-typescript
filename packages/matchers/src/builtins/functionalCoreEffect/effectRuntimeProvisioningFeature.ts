import { Array, Function, Option, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { Match as FactMatch } from "../../matcher/match.js"
import type { MatchContext } from "../../matcher/matchContext.js"
import type { Subscription } from "../../matcher/subscription.js"
import { nodeSubscriptions } from "../../matcher/nodeSubscriptions.js"
import { FunctionalCoreBoundaryData } from "./boundaryData.js"
import type { FunctionalCoreShapeData } from "./shapeData.js"
import { boundaryDetection } from "./boundaryDetection.js"
import type { FunctionalCoreEffectIndex } from "./functionalCoreEffectIndexClass.js"
import { nonTestRoleForSourceFile } from "./nonTestRole.js"
import { callIsPipeRuntimeHandoff } from "./effectRuntimeApis.js"
import { importedEffectApiAt } from "./importedEffectApiAt.js"
import { isManagedRuntimeMethodAccess } from "./managedRuntimeMethodAccess.js"
import { importedMemberAt } from "./importedMemberAt.js"
import { importedMemberSubject } from "./importedMemberSubject.js"
import { declarationIsContextReference } from "./contextReferenceNames.js"
import { declarationsOfSymbol } from "./declarationsOfSymbol.js"
import { declarationIsContextService } from "./declarationIsContextService.js"
import { detectionWhen } from "./detectionWhen.js"
import { emptyDetections } from "./emptyDetections.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { resolvedSymbolAt } from "../../support/resolvedSymbolAt.js"

const makeEffectRuntimeProvisioningFeature = () => {
  const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()
  const provideServiceNames = Array.of("provideService")

  const provideServiceTagArgument = (node: ts.CallExpression) => {
    const args = Array.fromIterable(node.arguments)
    const tagIndex = args.length >= 3 ? 1 : 0

    return Array.get(args, tagIndex)
  }

  const callIsReferenceProvideService = (checker: ts.TypeChecker, node: ts.CallExpression) => {
    const isProvideService = importedEffectApiAt(
      checker,
      node.expression,
      "Effect",
      provideServiceNames
    )

    const declarationIsContextReferenceCheck = (declaration: ts.Declaration) =>
      declarationIsContextReference(checker, declaration)

    const someContextReferenceDeclaration = (declarations: ReadonlyArray<ts.Declaration>) =>
      Array.some(declarations, declarationIsContextReferenceCheck)

    const referenceOverride = pipe(
      provideServiceTagArgument(node),
      Option.map(unwrapTransparentExpression),
      Option.flatMap(resolvedSymbolAt(checker)),
      Option.map(declarationsOfSymbol),
      Option.exists(someContextReferenceDeclaration)
    )

    const checks = Array.make(isProvideService, referenceOverride)

    return Array.every(checks, Boolean)
  }

  const runtimeNames = Array.make(
    "runCallback",
    "runFork",
    "runPromise",
    "runPromiseExit",
    "runSync",
    "runSyncExit",
    "runCallbackWith",
    "runForkWith",
    "runPromiseWith",
    "runPromiseExitWith",
    "runSyncWith",
    "runSyncExitWith"
  )

  const provideEffectNames = Array.make(
    "provide",
    "provideService",
    "provideServiceEffect",
    "provideContext"
  )

  const provideLayerNames = Array.make("provide", "provideMerge")
  const serviceLocatorEffectNames = Array.make("context", "contextWith")

  const serviceLocatorContextNames = Array.make(
    "get",
    "getOption",
    "getOrElse",
    "getUnsafe",
    "getOrUndefined",
    "getReferenceUnsafe"
  )

  const managedRuntimeMakeNames = Array.of("make")

  const platformRuntimePrefixes = Array.make(
    "@effect/platform-node",
    "@effect/platform-bun",
    "@effect/platform-deno",
    "@effect/platform-browser"
  )

  const callIsRuntimeExecution = (context: MatchContext, node: ts.CallExpression) => {
    const directEffect = importedEffectApiAt(
      context.checker,
      node.expression,
      "Effect",
      runtimeNames
    )

    const isManagedRuntimeMethod = (expression: ts.PropertyAccessExpression) =>
      isManagedRuntimeMethodAccess(context.checker, expression, runtimeNames)

    const managedRuntimeMethod = pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(node.expression),
      Option.exists(isManagedRuntimeMethod)
    )

    const pipeRuntimeHandoff = callIsPipeRuntimeHandoff(context.checker, node, runtimeNames)

    const runMain = pipe(
      importedMemberAt(context.checker, node.expression),
      Option.exists((member) => {
        const emptyName = Function.constant("")
        const lastOption = Array.last(member.path)
        const name = pipe(lastOption, Option.getOrElse(emptyName))

        const platformRuntime = Array.some(platformRuntimePrefixes, (prefix) =>
          member.moduleSpecifier.startsWith(prefix)
        )

        const isRunMain = strictEqual("runMain")(name)
        return platformRuntime && isRunMain
      })
    )

    const checks = Array.make(directEffect, managedRuntimeMethod, pipeRuntimeHandoff, runMain)

    return Array.some(checks, Boolean)
  }

  const callIsProvisioning = (context: MatchContext, node: ts.CallExpression) => {
    const effectProvide = importedEffectApiAt(
      context.checker,
      node.expression,
      "Effect",
      provideEffectNames
    )

    const referenceOverride = callIsReferenceProvideService(context.checker, node)
    const needsProvisioning = strictEqual(false)(referenceOverride)
    const effectProvisioningChecks = Array.make(effectProvide, needsProvisioning)
    const effectProvisioning = Array.every(effectProvisioningChecks, Boolean)

    const layerProvide = importedEffectApiAt(
      context.checker,
      node.expression,
      "Layer",
      provideLayerNames
    )

    const managedRuntimeMake = importedEffectApiAt(
      context.checker,
      node.expression,
      "ManagedRuntime",
      managedRuntimeMakeNames
    )

    const checks = Array.make(effectProvisioning, layerProvide, managedRuntimeMake)
    return Array.some(checks, Boolean)
  }

  const callIsServiceLocator = (context: MatchContext, node: ts.CallExpression) => {
    const effectContext = importedEffectApiAt(
      context.checker,
      node.expression,
      "Effect",
      serviceLocatorEffectNames
    )

    const contextLookup = importedEffectApiAt(
      context.checker,
      node.expression,
      "Context",
      serviceLocatorContextNames
    )

    const checks = Array.make(effectContext, contextLookup)
    return Array.some(checks, Boolean)
  }

  const runtimeCallElements =
    (index: FunctionalCoreEffectIndex) =>
    (context: MatchContext) =>
    (node: ts.CallExpression): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> => {
      const role = nonTestRoleForSourceFile(index, context.sourceFile)

      if (Option.isNone(role)) {
        return emptyDetections
      }

      const expressionText = node.expression.getText()
      const fallbackSubject = Function.constant(expressionText)

      const subject = pipe(
        importedMemberAt(context.checker, node.expression),
        Option.map(importedMemberSubject),
        Option.getOrElse(fallbackSubject)
      )

      const notRoot = role.value !== "root"
      const isRuntimeExecution = callIsRuntimeExecution(context, node)
      const shouldReportRuntime = notRoot && isRuntimeExecution

      const runtimeDetection = boundaryDetection(
        context,
        node.expression,
        role.value,
        "runtime-execution",
        subject
      )

      const runtime = detectionWhen(shouldReportRuntime, runtimeDetection)
      const isProvisioning = callIsProvisioning(context, node)
      const shouldReportProvisioning = notRoot && isProvisioning

      const provisioningDetection = boundaryDetection(
        context,
        node.expression,
        role.value,
        "dependency-provisioning",
        subject
      )

      const provisioning = detectionWhen(shouldReportProvisioning, provisioningDetection)
      const isServiceLocatorCall = callIsServiceLocator(context, node)
      const shouldReportServiceLocator = notRoot && isServiceLocatorCall

      const serviceLocatorDetection = boundaryDetection(
        context,
        node.expression,
        role.value,
        "service-locator",
        subject
      )

      const serviceLocator = detectionWhen(shouldReportServiceLocator, serviceLocatorDetection)
      const groups = Array.make(runtime, provisioning, serviceLocator)

      return Array.flatten(groups)
    }

  const runtimePropertyElements = (index: FunctionalCoreEffectIndex) => {
    const elementsForContext = (context: MatchContext) => {
      const declarationIsContextServiceCheck = (declaration: ts.Declaration) =>
        declarationIsContextService(context.checker, declaration)

      const elementsForNode = (
        node: ts.PropertyAccessExpression
      ): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> => {
        const role = nonTestRoleForSourceFile(index, context.sourceFile)

        if (Option.isNone(role)) {
          return emptyDetections
        }

        const notRoot = role.value !== "root"

        const accessIsNamedLayer = (access: ts.PropertyAccessExpression) =>
          strictEqual("layer")(access.name.text)

        return pipe(
          Option.liftPredicate(accessIsNamedLayer)(node),
          Option.flatMap((access) => {
            const expressionSymbol = context.checker.getSymbolAtLocation(access.expression)
            const symbolOption = Option.fromNullishOr(expressionSymbol)

            const resolvedSymbol = pipe(
              symbolOption,
              Option.map((symbol) => {
                const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0
                return isAlias ? context.checker.getAliasedSymbol(symbol) : symbol
              })
            )

            const declarations = pipe(
              resolvedSymbol,
              Option.map(declarationsOfSymbol),
              Option.getOrElse(Function.constant(emptyDeclarations))
            )

            return Array.findFirst(declarations, declarationIsContextServiceCheck)
          }),
          Option.filter(Function.constant(notRoot)),
          Option.map(() => {
            const subject = node.getText()

            return boundaryDetection(context, node, role.value, "dependency-provisioning", subject)
          }),
          Option.toArray
        )
      }

      return elementsForNode
    }

    return elementsForContext
  }

  const callKinds = Array.of(ts.SyntaxKind.CallExpression)
  const propertyKinds = Array.of(ts.SyntaxKind.PropertyAccessExpression)

  const effectRuntimeProvisioningFacts = (
    index: FunctionalCoreEffectIndex
  ): ReadonlyArray<Subscription<FunctionalCoreBoundaryData>> => {
    const callSubscriptions = nodeSubscriptions(callKinds)(ts.isCallExpression)(
      runtimeCallElements(index)
    )

    const propertySubscriptions = nodeSubscriptions(propertyKinds)(ts.isPropertyAccessExpression)(
      runtimePropertyElements(index)
    )

    return Array.appendAll(callSubscriptions, propertySubscriptions)
  }

  const emptyShapeFacts = (
    _index: FunctionalCoreEffectIndex
  ): ReadonlyArray<Subscription<FunctionalCoreShapeData>> => Array.empty()

  class Feature {
    constructor(
      readonly boundaryFacts: typeof effectRuntimeProvisioningFacts,
      readonly shapeFacts: typeof emptyShapeFacts
    ) {}
  }

  return new Feature(effectRuntimeProvisioningFacts, emptyShapeFacts)
}

export const effectRuntimeProvisioningFeature = makeEffectRuntimeProvisioningFeature()
