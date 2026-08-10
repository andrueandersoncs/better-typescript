import { Array, Function, Match as EffectMatch, Option, Record, Struct, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { Match as FactMatch } from "../../matcher/match.js"
import type { MatchContext } from "../../matcher/matchContext.js"
import type { Subscription } from "../../matcher/subscription.js"
import { nodeSubscriptions } from "../../matcher/nodeSubscriptions.js"
import { FunctionalCoreBoundaryData } from "./boundaryData.js"
import { boundaryDetection } from "./boundaryDetection.js"
import type { ArchitectureRole } from "../../support/architectureRoleType.js"
import type { FunctionalCoreEffectIndex } from "./functionalCoreEffectIndexClass.js"
import { withFunctionalCoreEffectIndex } from "./functionalCoreEffectIndexBuild.js"
import { roleForSourceFile } from "./roleForSourceFile.js"
import type { FunctionalCoreEffectPolicy } from "./functionalCoreEffectPolicyClass.js"
import { adapterBoundaryDetections } from "./adapterBoundaryDetections.js"
import { capabilityForbiddenRoles } from "./capabilityForbiddenRoles.js"
import { moduleMatchesPolicyPrefix } from "./moduleMatchesPolicyPrefix.js"
import { resolvedModuleSourceFile } from "./resolvedModuleSourceFile.js"
import { isTopLevelExportedDeclaration } from "./isTopLevelExportedDeclaration.js"
import { callIsPipeRuntimeHandoff } from "./effectRuntimeApis.js"
import { callConstructsContextApi } from "./callConstructsContextApi.js"
import { contextServiceNames } from "./contextServiceNames.js"
import { declarationIsContextReference } from "./contextReferenceNames.js"
import { declarationIsContextService } from "./declarationIsContextService.js"
import { effectServiceConfigObject } from "./effectServiceConfigObject.js"
import { effectServiceMakerObject } from "./effectServiceMakerObject.js"
import { effectApiMember } from "./effectApiMember.js"
import { importedEffectApiAt } from "./importedEffectApiAt.js"
import { isManagedRuntimeMethodAccess } from "./managedRuntimeMethodAccess.js"
import { specifierIsEffect } from "./specifierIsEffect.js"
import { importedMemberIsMovedPlatformCapability } from "./movedPlatformCapabilities.js"
import { declarationsOfSymbol } from "./declarationsOfSymbol.js"
import { importedMemberAt } from "./importedMemberAt.js"
import { importedMemberSubject } from "./importedMemberSubject.js"
import { importedTypeMemberAt } from "./importedTypeMemberAt.js"
import { localTypeReferenceTargets } from "./localTypeReferenceTargets.js"
import { moduleSpecifierText } from "./moduleSpecifierText.js"
import { typeReferenceIsGlobalPromise } from "./typeReferenceIsGlobalPromise.js"
import type { ImportedMember } from "./importedMember.js"
import { classDeclarationName } from "../../support/classDeclarationName.js"
import { propertyNameText } from "../../support/propertyNameText.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { variableDeclarationInitializer } from "../../support/variableDeclarationInitializer.js"
import { emptyDetections } from "./emptyDetections.js"
import { emptySymbols } from "./emptySymbols.js"
import { emptyNamespace } from "./emptyNamespace.js"
import { firstForbiddenDomainMember } from "./noneIdentifierHelpers.js"
import { canImportRole } from "../../support/architectureRoleType.js"
import { isForbiddenDomainMember } from "./forbiddenDomainMember.js"
import { importBindingIdentifiers } from "./importBindingIdentifiers.js"
import { exportBindingIdentifiers } from "./exportBindingIdentifiers.js"
import { detectionWhen } from "./detectionWhen.js"
import { nonTestRoleForSourceFile } from "./nonTestRole.js"
import { portRoleForSourceFile } from "./portRole.js"
import { resolvedSymbolAt } from "../../support/resolvedSymbolAt.js"

const emptyPath: ReadonlyArray<string> = Array.empty()

const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()

const contextServiceLayerPropertyNames = Array.of("layer")

const modifierIsStatic = flow(
  Struct.get<ts.ModifierLike, "kind">("kind"),
  strictEqual(ts.SyntaxKind.StaticKeyword)
)

const someStaticModifier = (modifiers: readonly ts.ModifierLike[]) =>
  Array.some(modifiers, modifierIsStatic)

const hasStaticModifier = (declaration: ts.PropertyDeclaration) =>
  pipe(Option.fromNullishOr(declaration.modifiers), Option.exists(someStaticModifier))

const nameIsLayerProperty = (name: string) => Array.contains(contextServiceLayerPropertyNames, name)

const hasLayerStaticProperty = (declaration: ts.PropertyDeclaration) =>
  hasStaticModifier(declaration) &&
  pipe(propertyNameText(declaration.name), Option.exists(nameIsLayerProperty))

const isContextServiceLayerProperty = (member: ts.ClassElement) =>
  ts.isPropertyDeclaration(member) && hasLayerStaticProperty(member)

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

const effectServiceConfigFromExpression = (checker: ts.TypeChecker, expression: ts.Expression) => {
  const current = unwrapTransparentExpression(expression)
  const isContextService = callConstructsContextApi(checker, current, contextServiceNames)
  const keepContextService = Function.constant(isContextService)

  return pipe(
    current,
    Option.liftPredicate(keepContextService),
    Option.flatMap(effectServiceMakerObject)
  )
}

const namedImportsHaveRuntimeValue = (bindings: ts.NamedImports) =>
  Array.some(bindings.elements, (specifier) => !specifier.isTypeOnly)

const importHasRuntimeValue = (declaration: ts.ImportDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.importClause),
    Option.match({
      onNone: Function.constTrue,
      onSome: (clause) => {
        const isValueImport = !clause.isTypeOnly
        const defaultName = Option.fromNullishOr(clause.name)
        const hasDefaultName = Option.isSome(defaultName)

        const hasNamedRuntime = pipe(
          Option.fromNullishOr(clause.namedBindings),
          Option.match({
            onNone: Function.constTrue,
            onSome: (bindings) =>
              pipe(
                EffectMatch.value(bindings),
                EffectMatch.when(ts.isNamespaceImport, Function.constTrue),
                EffectMatch.when(ts.isNamedImports, namedImportsHaveRuntimeValue),
                EffectMatch.exhaustive
              )
          })
        )

        const hasRuntimeBinding = hasDefaultName || hasNamedRuntime
        const matchFlags = Array.make(isValueImport, hasRuntimeBinding)

        return Array.every(matchFlags, Boolean)
      }
    })
  )

const forbiddenDomainImport = (context: MatchContext, declaration: ts.ImportDeclaration) => {
  const identifiers = importBindingIdentifiers(declaration)
  return firstForbiddenDomainMember(context, identifiers, true)
}

const architectureImportElements = (index: FunctionalCoreEffectIndex) => {
  const roleForResolvedSourceFile = (sourceFile: ts.SourceFile) =>
    roleForSourceFile(index, sourceFile)

  const subjectMatchesPolicyPrefix = (subject: string) =>
    moduleMatchesPolicyPrefix(index.policy, subject)

  const elementsForContext = (context: MatchContext) => {
    const elementsForNode = (
      node: ts.ImportDeclaration
    ): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> => {
      const role = roleForSourceFile(index, context.sourceFile)

      if (Option.isNone(role)) {
        return emptyDetections
      }

      const targetRole = pipe(
        resolvedModuleSourceFile(context, node),
        Option.flatMap(roleForResolvedSourceFile)
      )

      const cannotImportRole = (target: ArchitectureRole) => !canImportRole(role.value, target)

      const directionDetection = pipe(
        targetRole,
        Option.filter(cannotImportRole),
        Option.map((target) => {
          const subject = `${role.value} -> ${target}`
          const targetOption = Option.some(target)

          return boundaryDetection(
            context,
            node.moduleSpecifier,
            role.value,
            "dependency-direction",
            subject,
            targetOption
          )
        }),
        Option.toArray
      )

      const domainEffectProgramDetection = (subject: string) =>
        boundaryDetection(
          context,
          node.moduleSpecifier,
          role.value,
          "domain-effect-program",
          subject
        )

      const domainDetection = strictEqual("domain")(role.value)
        ? pipe(
            forbiddenDomainImport(context, node),
            Option.map(domainEffectProgramDetection),
            Option.toArray
          )
        : emptyDetections

      const importProvidesRuntime = importHasRuntimeValue(node)
      const roleForbidsCapability = capabilityForbiddenRoles[role.value]

      const moduleCapability = pipe(
        moduleSpecifierText(node),
        Option.filter(Function.constant(importProvidesRuntime)),
        Option.filter(subjectMatchesPolicyPrefix)
      )

      const pipeOf = (identifier: ts.Identifier) =>
        pipe(
          importedMemberAt(context.checker, identifier),
          Option.filter(importedMemberIsMovedPlatformCapability),
          Option.map(importedMemberSubject)
        )

      const barrelCapability = importProvidesRuntime
        ? pipe(
            importBindingIdentifiers(node),
            Array.map(pipeOf),
            Array.findFirst(Option.isSome),
            Option.flatten
          )
        : Option.none()

      const directCapabilityDetection = (subject: string) =>
        boundaryDetection(context, node.moduleSpecifier, role.value, "direct-capability", subject)

      const capabilityDetection = pipe(
        moduleCapability,
        Option.orElse(Function.constant(barrelCapability)),
        Option.filter(Function.constant(roleForbidsCapability)),
        Option.map(directCapabilityDetection),
        Option.toArray
      )

      const domainAndCapability = Array.appendAll(domainDetection, capabilityDetection)
      return Array.appendAll(directionDetection, domainAndCapability)
    }

    return elementsForNode
  }

  return elementsForContext
}

const moduleSpecifierIsForbiddenDomain = (moduleSpecifier: string) =>
  isForbiddenDomainMember(moduleSpecifier, emptyPath)

const forbiddenDomainExport = (context: MatchContext, declaration: ts.ExportDeclaration) => {
  const exportClauseOption = Option.fromNullishOr(declaration.exportClause)

  if (Option.isNone(exportClauseOption)) {
    return pipe(moduleSpecifierText(declaration), Option.filter(moduleSpecifierIsForbiddenDomain))
  }

  const identifiers = exportBindingIdentifiers(declaration)
  return firstForbiddenDomainMember(context, identifiers, false)
}

const exportElementIsValue = flow(
  Struct.get<ts.ExportSpecifier, "isTypeOnly">("isTypeOnly"),
  strictEqual(false)
)

const namedExportsHaveValue = (named: ts.NamedExports) =>
  Array.some(named.elements, exportElementIsValue)

const exportClauseAllowsRuntime = (exportClause: ts.NamedExportBindings) =>
  pipe(
    EffectMatch.value(exportClause),
    EffectMatch.when(ts.isNamespaceExport, Function.constTrue),
    EffectMatch.when(ts.isNamedExports, namedExportsHaveValue),
    EffectMatch.exhaustive
  )

const exportHasRuntimeValue = (declaration: ts.ExportDeclaration) => {
  const isValueExport = strictEqual(false)(declaration.isTypeOnly)
  const exportClauseOption = Option.fromNullishOr(declaration.exportClause)

  const clauseAllowsRuntime = Option.match(exportClauseOption, {
    onNone: Function.constTrue,
    onSome: exportClauseAllowsRuntime
  })

  const runtimeChecks = Array.make(isValueExport, clauseAllowsRuntime)
  return Array.every(runtimeChecks, Boolean)
}

const architectureExportElements = (index: FunctionalCoreEffectIndex) => {
  const roleForResolvedSourceFile2 = (sourceFile: ts.SourceFile) =>
    roleForSourceFile(index, sourceFile)

  const subjectMatchesPolicyPrefix2 = (subject: string) =>
    moduleMatchesPolicyPrefix(index.policy, subject)

  const elementsForContext = (context: MatchContext) => {
    const elementsForNode = (
      node: ts.ExportDeclaration
    ): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> => {
      const role = roleForSourceFile(index, context.sourceFile)
      const moduleSpecifierOption = Option.fromNullishOr(node.moduleSpecifier)
      const exportInputs = Option.all({ role, moduleSpecifier: moduleSpecifierOption })

      if (Option.isNone(exportInputs)) {
        return emptyDetections
      }

      const targetRole = pipe(
        resolvedModuleSourceFile(context, node),
        Option.flatMap(roleForResolvedSourceFile2)
      )

      const cannotImportRole2 = (target: ArchitectureRole) =>
        !canImportRole(exportInputs.value.role, target)

      const directionDetection = pipe(
        targetRole,
        Option.filter(cannotImportRole2),
        Option.map((target) => {
          const subject = `${exportInputs.value.role} -> ${target}`
          const targetOption = Option.some(target)

          return boundaryDetection(
            context,
            exportInputs.value.moduleSpecifier,
            exportInputs.value.role,
            "dependency-direction",
            subject,
            targetOption
          )
        }),
        Option.toArray
      )

      const domainEffectProgramDetection2 = (subject: string) =>
        boundaryDetection(
          context,
          exportInputs.value.moduleSpecifier,
          exportInputs.value.role,
          "domain-effect-program",
          subject
        )

      const domainDetection = strictEqual("domain")(exportInputs.value.role)
        ? pipe(
            forbiddenDomainExport(context, node),
            Option.map(domainEffectProgramDetection2),
            Option.toArray
          )
        : emptyDetections

      const exportProvidesRuntime = exportHasRuntimeValue(node)
      const roleForbidsCapability = capabilityForbiddenRoles[exportInputs.value.role]

      const moduleCapability = pipe(
        moduleSpecifierText(node),
        Option.filter(Function.constant(exportProvidesRuntime)),
        Option.filter(subjectMatchesPolicyPrefix2)
      )

      const pipeOf2 = (identifier: ts.Identifier) =>
        pipe(
          importedMemberAt(context.checker, identifier),
          Option.filter(importedMemberIsMovedPlatformCapability),
          Option.map(importedMemberSubject)
        )

      const barrelCapability = exportProvidesRuntime
        ? pipe(
            exportBindingIdentifiers(node),
            Array.map(pipeOf2),
            Array.findFirst(Option.isSome),
            Option.flatten
          )
        : Option.none()

      const directCapabilityDetection2 = (subject: string) =>
        boundaryDetection(
          context,
          exportInputs.value.moduleSpecifier,
          exportInputs.value.role,
          "direct-capability",
          subject
        )

      const capabilityDetection = pipe(
        moduleCapability,
        Option.orElse(Function.constant(barrelCapability)),
        Option.filter(Function.constant(roleForbidsCapability)),
        Option.map(directCapabilityDetection2),
        Option.toArray
      )

      const domainAndCapability = Array.appendAll(domainDetection, capabilityDetection)
      return Array.appendAll(directionDetection, domainAndCapability)
    }

    return elementsForNode
  }

  return elementsForContext
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

const portLayerNames = Array.make("effect", "succeed")

const managedRuntimeMakeNames = Array.of("make")

const contextTypeNames = Array.of("Context")

const managedRuntimeTypeNames = Array.of("ManagedRuntime")

const platformRuntimePrefixes = Array.make(
  "@effect/platform-node",
  "@effect/platform-bun",
  "@effect/platform-deno",
  "@effect/platform-browser"
)

const callIsRuntimeExecution = (context: MatchContext, node: ts.CallExpression) => {
  const directEffect = importedEffectApiAt(context.checker, node.expression, "Effect", runtimeNames)

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

const callIsPortLayer = (context: MatchContext, node: ts.CallExpression) =>
  importedEffectApiAt(context.checker, node.expression, "Layer", portLayerNames)

const isDomainArchitectureRole = strictEqual("domain" as ArchitectureRole)

const domainRoleForSourceFile = (index: FunctionalCoreEffectIndex, sourceFile: ts.SourceFile) =>
  pipe(roleForSourceFile(index, sourceFile), Option.filter(isDomainArchitectureRole))

const callExpressionElements =
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
    const isPort = strictEqual("port")(role.value)
    const isPortLayerCall = callIsPortLayer(context, node)
    const shouldReportPortLayer = isPort && isPortLayerCall

    const portLayerDetection = boundaryDetection(
      context,
      node.expression,
      role.value,
      "port-live-implementation",
      subject
    )

    const portLayer = detectionWhen(shouldReportPortLayer, portLayerDetection)
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
    const adapterBoundary = adapterBoundaryDetections(index, context, node, role.value)
    const groups = Array.make(runtime, provisioning, portLayer, serviceLocator, adapterBoundary)

    return Array.flatten(groups)
  }

const newExpressionElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: MatchContext) =>
  (node: ts.NewExpression): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> => {
    const role = nonTestRoleForSourceFile(index, context.sourceFile)

    const detectionsForRole = (resolvedRole: ArchitectureRole) =>
      adapterBoundaryDetections(index, context, node, resolvedRole)

    const matchRole = Option.match({
      onNone: Function.constant(emptyDetections),
      onSome: detectionsForRole
    })

    return matchRole(role)
  }

const propertyAccessElements = (index: FunctionalCoreEffectIndex) => {
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
      const adapterBoundary = adapterBoundaryDetections(index, context, node, role.value)

      const accessIsNamedLayer = (access: ts.PropertyAccessExpression) =>
        strictEqual("layer")(access.name.text)

      const layerSelection = pipe(
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

          const emptyDeclarationsFallback = Function.constant(emptyDeclarations)

          const declarations = pipe(
            resolvedSymbol,
            Option.map(declarationsOfSymbol),
            Option.getOrElse(emptyDeclarationsFallback)
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

      const groups = Array.make(adapterBoundary, layerSelection)
      return Array.flatten(groups)
    }

    return elementsForNode
  }

  return elementsForContext
}

const classDeclarationElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: MatchContext) =>
  (node: ts.ClassDeclaration): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> => {
    const role = portRoleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role)) {
      return emptyDetections
    }

    const serviceConfig = effectServiceConfigObject(context.checker, node)
    const liveService = Option.isSome(serviceConfig)

    if (!liveService) {
      return emptyDetections
    }

    const target = pipe(classDeclarationName(node), Option.getOrElse(Function.constant(node)))
    const targetText = target.getText()

    const liveImplementation = boundaryDetection(
      context,
      target,
      role.value,
      "port-live-implementation",
      targetText
    )

    const embeddedLayerDetection = (propertyName: ts.PropertyName) => {
      const subject = `${targetText}.${propertyName.getText()}`
      return boundaryDetection(
        context,
        propertyName,
        role.value,
        "port-live-implementation",
        subject
      )
    }

    const embeddedLayer = pipe(
      Array.findFirst(node.members, isContextServiceLayerProperty),
      Option.map(Struct.get("name")),
      Option.flatMap(Option.fromNullishOr),
      Option.map(embeddedLayerDetection),
      Option.toArray
    )

    return Array.prepend(embeddedLayer, liveImplementation)
  }

const variableDeclarationElements = (index: FunctionalCoreEffectIndex) => {
  const elementsForContext = (context: MatchContext) => {
    const configFromExpression = (expression: ts.Expression) =>
      effectServiceConfigFromExpression(context.checker, expression)

    const elementsForNode = (
      node: ts.VariableDeclaration
    ): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> => {
      const role = portRoleForSourceFile(index, context.sourceFile)

      if (Option.isNone(role)) {
        return emptyDetections
      }

      const serviceConfig = pipe(
        variableDeclarationInitializer(node),
        Option.flatMap(configFromExpression)
      )

      if (Option.isNone(serviceConfig)) {
        return emptyDetections
      }

      const targetText = node.name.getText()

      const liveImplementation = boundaryDetection(
        context,
        node.name,
        role.value,
        "port-live-implementation",
        targetText
      )

      return Array.of(liveImplementation)
    }

    return elementsForNode
  }

  return elementsForContext
}

const forbiddenContractEffectNamespaces: Readonly<Record<string, true>> = {
  Ref: true,
  SynchronizedRef: true,
  Queue: true,
  PubSub: true,
  SubscriptionRef: true,
  References: true,
  Runtime: true,
  ManagedRuntime: true,
  Latch: true,
  Semaphore: true
}

const effectSubpathNamespace = (specifier: string) => {
  const effectPath = specifier.slice("effect/".length)
  const segments = effectPath.split("/")
  const namespace = Array.get(segments, 0)

  return pipe(namespace, Option.getOrElse(emptyNamespace))
}

const barrelPathNamespace = (path: ReadonlyArray<string>) =>
  pipe(Array.get(path, 0), Option.getOrElse(emptyNamespace))

const effectNamespaceFromMember = (member: ImportedMember) =>
  pipe(
    Option.liftPredicate(specifierIsEffect)(member.moduleSpecifier),
    Option.map(() => barrelPathNamespace(member.path)),
    Option.orElse(() =>
      pipe(
        Option.liftPredicate((specifier: string) => specifier.startsWith("effect/"))(
          member.moduleSpecifier
        ),
        Option.map(effectSubpathNamespace)
      )
    ),
    Option.getOrElse(emptyNamespace)
  )

const typeReferenceSubject = (
  context: MatchContext,
  policy: FunctionalCoreEffectPolicy,
  node: ts.TypeReferenceNode,
  visited: ReadonlyArray<ts.Symbol> = emptySymbols
): Option.Option<string> => {
  if (typeReferenceIsGlobalPromise(context, node)) {
    return Option.some("Promise")
  }

  const direct = pipe(
    importedTypeMemberAt(context.checker, node.typeName),
    Option.filter((member) => {
      const effectNamespace = effectNamespaceFromMember(member)
      const stateOrRuntime = strictEqual(true)(forbiddenContractEffectNamespaces[effectNamespace])
      const capability = moduleMatchesPolicyPrefix(policy, member.moduleSpecifier)
      const emptyName = Function.constant("")
      const lastOption = Array.last(member.path)
      const typeName = pipe(lastOption, Option.getOrElse(emptyName))

      const infrastructureSuffix = Array.some(policy.resourceTypeSuffixes, (suffix) =>
        typeName.endsWith(suffix)
      )

      const checks = Array.make(stateOrRuntime, capability, infrastructureSuffix)
      return Array.some(checks, Boolean)
    }),
    Option.map(importedMemberSubject)
  )

  if (Option.isSome(direct)) {
    return direct
  }

  const typeNameSymbol = context.checker.getSymbolAtLocation(node.typeName)
  const symbolOption = Option.fromNullishOr(typeNameSymbol)

  const someOf = (symbol: ts.Symbol) => {
    const candidateEqualsSymbol = strictEqual(symbol)
    const alreadyVisited = Array.some(visited, candidateEqualsSymbol)
    return strictEqual(false)(alreadyVisited)
  }

  return pipe(
    symbolOption,
    Option.filter(someOf),
    Option.map((symbol) => {
      const nextVisited = Array.append(visited, symbol)
      const targets = localTypeReferenceTargets(context.checker, node)

      const typeReferenceSubjectOf = (target: ts.TypeReferenceNode) =>
        typeReferenceSubject(context, policy, target, nextVisited)

      return pipe(
        targets,
        Array.map(typeReferenceSubjectOf),
        Array.findFirst(Option.isSome),
        Option.flatten
      )
    }),
    Option.flatten
  )
}

const typeIsServiceLocator = (
  context: MatchContext,
  node: ts.TypeReferenceNode,
  visited: ReadonlyArray<ts.Symbol> = emptySymbols
): boolean => {
  const direct = pipe(
    importedTypeMemberAt(context.checker, node.typeName),
    Option.exists((member) => {
      const contextType = effectApiMember(member, "Context", contextTypeNames)
      const managedRuntimeType = effectApiMember(member, "ManagedRuntime", managedRuntimeTypeNames)
      const checks = Array.make(contextType, managedRuntimeType)
      return Array.some(checks, Boolean)
    })
  )

  const typeNameSymbol = context.checker.getSymbolAtLocation(node.typeName)
  const unresolvedSymbolOption = Option.fromNullishOr(typeNameSymbol)

  const symbolOption = pipe(
    unresolvedSymbolOption,
    Option.map((unresolvedSymbol) => {
      const isAlias = (unresolvedSymbol.flags & ts.SymbolFlags.Alias) !== 0
      return isAlias ? context.checker.getAliasedSymbol(unresolvedSymbol) : unresolvedSymbol
    })
  )

  const someOf2 = (symbol: ts.Symbol) => {
    const candidateEqualsSymbol = strictEqual(symbol)
    return Array.some(visited, candidateEqualsSymbol)
  }

  const alreadyVisited = pipe(symbolOption, Option.exists(someOf2))
  const notVisited = strictEqual(false)(alreadyVisited)

  const nested = pipe(
    symbolOption,
    Option.filter(Function.constant(notVisited)),
    Option.map((symbol) => {
      const nextVisited = Array.append(visited, symbol)
      const targets = localTypeReferenceTargets(context.checker, node)

      const targetIsServiceLocator = (target: ts.TypeReferenceNode) =>
        typeIsServiceLocator(context, target, nextVisited)

      return Array.some(targets, targetIsServiceLocator)
    }),
    Option.getOrElse(Function.constFalse)
  )

  const checks = Array.make(direct, nested)
  return Array.some(checks, Boolean)
}

const typeReferenceElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: MatchContext) =>
  (node: ts.TypeReferenceNode): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role)) {
      return emptyDetections
    }

    const isTestRole = strictEqual("test")(role.value)
    const isRootRole = strictEqual("root")(role.value)
    const skippedRoles = Array.make(isTestRole, isRootRole)

    if (Array.some(skippedRoles, Boolean)) {
      return emptyDetections
    }

    const typeNameText = node.typeName.getText()
    const isServiceLocatorType = typeIsServiceLocator(context, node)

    const serviceLocatorDetection = boundaryDetection(
      context,
      node.typeName,
      role.value,
      "service-locator",
      typeNameText
    )

    const serviceLocator = detectionWhen(isServiceLocatorType, serviceLocatorDetection)
    const isPortRole = strictEqual("port")(role.value)
    const isTopLevelExport = isTopLevelExportedDeclaration(node)
    const shouldCheckInfrastructure = isPortRole && isTopLevelExport

    const infrastructureContractDetection = (subject: string) =>
      boundaryDetection(context, node.typeName, role.value, "infrastructure-contract", subject)

    const infrastructureContract = shouldCheckInfrastructure
      ? pipe(
          typeReferenceSubject(context, index.policy, node),
          Option.map(infrastructureContractDetection),
          Option.toArray
        )
      : emptyDetections

    const isDomainRole = strictEqual("domain")(role.value)
    const isGlobalPromise = typeReferenceIsGlobalPromise(context, node)
    const shouldCheckDomainPromise = isDomainRole && isGlobalPromise

    const domainPromiseDetection = boundaryDetection(
      context,
      node.typeName,
      role.value,
      "domain-effect-program",
      "Promise"
    )

    const domainPromise = detectionWhen(shouldCheckDomainPromise, domainPromiseDetection)
    const groups = Array.make(serviceLocator, infrastructureContract, domainPromise)
    return Array.flatten(groups)
  }

const asyncKeywordElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> => {
    const role = domainRoleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role)) {
      return emptyDetections
    }

    const domainPromise = boundaryDetection(
      context,
      node,
      role.value,
      "domain-effect-program",
      "Promise"
    )

    return Array.of(domainPromise)
  }

const isAsyncKeyword = (
  node: ts.Node
): node is ts.Node & { readonly kind: ts.SyntaxKind.AsyncKeyword } =>
  strictEqual(ts.SyntaxKind.AsyncKeyword)(node.kind)

const exportKinds = Array.of(ts.SyntaxKind.ExportDeclaration)

const asyncKeywordKinds = Array.of(ts.SyntaxKind.AsyncKeyword)

const importKinds = Array.of(ts.SyntaxKind.ImportDeclaration)

const callKinds = Array.of(ts.SyntaxKind.CallExpression)

const newKinds = Array.of(ts.SyntaxKind.NewExpression)

const propertyKinds = Array.of(ts.SyntaxKind.PropertyAccessExpression)

const classKinds = Array.of(ts.SyntaxKind.ClassDeclaration)

const variableKinds = Array.of(ts.SyntaxKind.VariableDeclaration)

const typeReferenceKinds = Array.of(ts.SyntaxKind.TypeReference)

const subscriptionsFor = (index: FunctionalCoreEffectIndex): ReadonlyArray<Subscription> => {
  const importElements = architectureImportElements(index)
  const exportElements = architectureExportElements(index)
  const callElements = callExpressionElements(index)
  const newElements = newExpressionElements(index)
  const propertyElements = propertyAccessElements(index)
  const classElements = classDeclarationElements(index)
  const variableElements = variableDeclarationElements(index)
  const typeReferenceElementsForIndex = typeReferenceElements(index)
  const asyncElements = asyncKeywordElements(index)
  const importSubscriptions = nodeSubscriptions(importKinds)(ts.isImportDeclaration)(importElements)
  const exportSubscriptions = nodeSubscriptions(exportKinds)(ts.isExportDeclaration)(exportElements)
  const callSubscriptions = nodeSubscriptions(callKinds)(ts.isCallExpression)(callElements)
  const newSubscriptions = nodeSubscriptions(newKinds)(ts.isNewExpression)(newElements)

  const propertySubscriptions = nodeSubscriptions(propertyKinds)(ts.isPropertyAccessExpression)(
    propertyElements
  )

  const classSubscriptions = nodeSubscriptions(classKinds)(ts.isClassDeclaration)(classElements)

  const variableSubscriptions = nodeSubscriptions(variableKinds)(ts.isVariableDeclaration)(
    variableElements
  )

  const typeReferenceSubscriptions = nodeSubscriptions(typeReferenceKinds)(ts.isTypeReferenceNode)(
    typeReferenceElementsForIndex
  )

  const asyncSubscriptions = nodeSubscriptions(asyncKeywordKinds)(isAsyncKeyword)(asyncElements)

  const groups = Array.make(
    importSubscriptions,
    exportSubscriptions,
    callSubscriptions,
    newSubscriptions,
    propertySubscriptions,
    classSubscriptions,
    variableSubscriptions,
    typeReferenceSubscriptions,
    asyncSubscriptions
  )

  return Array.flatten(groups)
}

export const makeFunctionalCoreEffect = withFunctionalCoreEffectIndex(subscriptionsFor)
