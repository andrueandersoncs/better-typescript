import { Array, Function, HashMap, Match, Option, Struct, Tuple, flow, pipe } from "effect"
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
import { importedEffectApiAt } from "./importedEffectApiAt.js"
import { importedMemberAt } from "./importedMemberAt.js"
import { importedMemberSubject } from "./importedMemberSubject.js"
import { emptyDetections } from "./emptyDetections.js"
import { detectionWhen } from "./detectionWhen.js"
import { callConstructsContextApi } from "./callConstructsContextApi.js"
import { contextServiceNames } from "./contextServiceNames.js"
import { effectServiceMakerObject } from "./effectServiceMakerObject.js"
import { effectServiceConfigObject } from "./effectServiceConfigObject.js"
import { classDeclarationName } from "../../support/classDeclarationName.js"
import { propertyNameText } from "../../support/propertyNameText.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { variableDeclarationInitializer } from "../../support/variableDeclarationInitializer.js"
import { foldAst } from "../../sources/foldAst.js"
import type { ArchitectureRole } from "../../support/architectureRoleType.js"
import { ambientCapabilityPropertySubject } from "./ambientCapabilityPropertySubject.js"
import { isAdapterOrRootRole } from "./adapterRootRoles.js"
import { ambientPathAt } from "./ambientPath.js"
import { capabilityForbiddenRoles } from "./capabilityForbiddenRoles.js"
import { enclosingFunctionLike } from "./enclosingFunctionLike.js"
import type { FunctionalCoreEffectPolicy } from "./functionalCoreEffectPolicyClass.js"
import { hasEffectCallAncestor } from "./hasEffectCallAncestor.js"
import type { ImportedMember } from "./importedMember.js"
import { isRuntimeFunctionLike } from "./isRuntimeFunctionLike.js"
import { importedMemberIsMovedPlatformCapability } from "./movedPlatformCapabilities.js"
import { moduleMatchesPolicyPrefix } from "./moduleMatchesPolicyPrefix.js"
import { roleForSourceFileWhen } from "./roleForSourceFileWhen.js"

const makePortAdapterResourceLifetimeFeature = () => {
  const isPortArchitectureRole = strictEqual("port" as ArchitectureRole)
  const portRoleForSourceFile = roleForSourceFileWhen(isPortArchitectureRole)

  const ambientDirectNames = Array.make(
    "fetch",
    "setTimeout",
    "setInterval",
    "setImmediate",
    "queueMicrotask"
  )

  const ambientExactMembers = Array.make("Date.now", "Math.random", "crypto.randomUUID")

  const ambientCallSubject = (checker: ts.TypeChecker, expression: ts.Expression) =>
    pipe(
      ambientPathAt(checker, expression),
      Option.filter((path) => {
        const joined = Array.join(path, ".")
        const isSingleSegment = strictEqual(1)(path.length)
        const directMatch = isSingleSegment && Array.contains(ambientDirectNames, joined)
        const exactMatch = Array.contains(ambientExactMembers, joined)
        const receiver = Array.get(path, 0)
        const isLocalStorage = pipe(receiver, Option.contains("localStorage"))
        const isSessionStorage = pipe(receiver, Option.contains("sessionStorage"))
        const storageMatch = isLocalStorage || isSessionStorage
        const consoleMatch = pipe(receiver, Option.contains("console"))
        const ambientFlags = Array.make(directMatch, exactMatch, storageMatch, consoleMatch)

        return Array.some(ambientFlags, Boolean)
      }),
      Option.map(Array.join("."))
    )

  const capabilitySubjectAt = (
    context: MatchContext,
    policy: FunctionalCoreEffectPolicy,
    node: ts.CallExpression | ts.NewExpression
  ) => {
    const pathTextEquals = flow(Array.join("."), strictEqual("Date"))

    const pipeOf6 = (expression: ts.CallExpression | ts.NewExpression) =>
      pipe(
        ambientPathAt(context.checker, expression.expression),
        Option.filter(pathTextEquals),
        Option.as("new Date")
      )

    const expressionHasNoArguments = (expression: ts.NewExpression) =>
      strictEqual(0)(expression.arguments?.length ?? 0)

    const newDate = pipe(
      Option.liftPredicate(ts.isNewExpression)(node),
      Option.filter(expressionHasNoArguments),
      Option.flatMap(pipeOf6)
    )

    const ambient = ambientCallSubject(context.checker, node.expression)

    const memberMatchesPolicyPrefix = (member: ImportedMember) =>
      moduleMatchesPolicyPrefix(policy, member.moduleSpecifier) ||
      importedMemberIsMovedPlatformCapability(member)

    const imported = pipe(
      importedMemberAt(context.checker, node.expression),
      Option.filter(memberMatchesPolicyPrefix),
      Option.map((member) => {
        const memberPath = Array.join(member.path, ".")
        return `${member.moduleSpecifier}:${memberPath}`
      })
    )

    const candidates = Array.make(newDate, ambient, imported)

    return Option.firstSomeOf(candidates)
  }

  const unsafeConstructorNames = Array.of("makeUnsafe")
  const refConstructors = Tuple.make("Ref", unsafeConstructorNames)
  const synchronizedRefConstructors = Tuple.make("SynchronizedRef", unsafeConstructorNames)
  const latchConstructors = Tuple.make("Latch", unsafeConstructorNames)
  const semaphoreConstructors = Tuple.make("Semaphore", unsafeConstructorNames)

  const stateConstructorEntries = HashMap.make(
    refConstructors,
    synchronizedRefConstructors,
    latchConstructors,
    semaphoreConstructors
  )

  const callIsEscapingState = (context: MatchContext, node: ts.CallExpression) => {
    const entries = HashMap.toEntries(stateConstructorEntries)

    const isEscapingConstructor = ([namespace, names]: readonly [string, ReadonlyArray<string>]) =>
      importedEffectApiAt(context.checker, node.expression, namespace, names)

    return Array.some(entries, isEscapingConstructor)
  }

  const expressionSubject = (context: MatchContext, expression: ts.Expression) => {
    const expressionText = expression.getText()
    const fallbackSubject = Function.constant(expressionText)

    return pipe(
      importedMemberAt(context.checker, expression),
      Option.map(importedMemberSubject),
      Option.getOrElse(fallbackSubject)
    )
  }

  // One operation owns call/new/property boundary facts because split modules drift.
  const adapterBoundaryDetections = (
    index: FunctionalCoreEffectIndex,
    context: MatchContext,
    node: ts.Node,
    role: ArchitectureRole
  ): ReadonlyArray<FactMatch<typeof FunctionalCoreBoundaryData.Type>> => {
    const effectLifecycleNames = Array.make(
      "acquireRelease",
      "acquireUseRelease",
      "acquireDisposable",
      "addFinalizer"
    )

    const suspensionNames = Array.make(
      "callback",
      "promise",
      "suspend",
      "sync",
      "try",
      "tryPromise"
    )

    const tryEffectNames = Array.make("try", "tryPromise")

    const isSuspensionCallbackDeclaration = (
      checker: ts.TypeChecker,
      declaration: ts.FunctionLikeDeclaration
    ) => {
      if (ts.isCallExpression(declaration.parent)) {
        const argumentIsDeclaration = strictEqual(declaration)
        const isArgument = Array.some(declaration.parent.arguments, argumentIsDeclaration)

        const isSuspension = importedEffectApiAt(
          checker,
          declaration.parent.expression,
          "Effect",
          suspensionNames
        )

        return isArgument && isSuspension
      }

      const importedEffectApiAtOf3 = (call: ts.CallExpression) =>
        importedEffectApiAt(checker, call.expression, "Effect", tryEffectNames)

      const textIsTry = strictEqual("try")

      const pipeOf7 = (assignment: ts.PropertyAssignment) =>
        pipe(
          Match.value(assignment.name),
          Match.when(ts.isIdentifier, Struct.get<ts.Identifier, "text">("text")),
          Match.when(ts.isStringLiteralLike, Struct.get<ts.StringLiteralLike, "text">("text")),
          Match.orElse(Function.constant("")),
          Option.liftPredicate(textIsTry),
          Option.map(() => assignment.parent),
          Option.filter(ts.isObjectLiteralExpression),
          Option.map(Struct.get("parent")),
          Option.filter(ts.isCallExpression),
          Option.map(importedEffectApiAtOf3)
        )

      const assignmentInitializesDeclaration = flow(
        Struct.get<ts.PropertyAssignment, "initializer">("initializer"),
        strictEqual(declaration)
      )

      return pipe(
        Option.liftPredicate(ts.isPropertyAssignment)(declaration.parent),
        Option.filter(assignmentInitializesDeclaration),
        Option.flatMap(pipeOf7),
        Option.getOrElse(Function.constFalse)
      )
    }

    const hasSuspensionBoundary = (checker: ts.TypeChecker, currentNode: ts.Node) => {
      const visit = (current: ts.Node): boolean => {
        const isSuspensionCallback =
          isRuntimeFunctionLike(current) && isSuspensionCallbackDeclaration(checker, current)

        return isSuspensionCallback
          ? true
          : pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
      }

      return visit(currentNode)
    }

    const enclosingVariableNameNode = (currentNode: ts.Node): Option.Option<ts.Identifier> =>
      pipe(
        Option.fromNullishOr(currentNode.parent),
        Option.flatMap((parent) => {
          if (ts.isVariableDeclaration(parent)) {
            return Option.liftPredicate(ts.isIdentifier)(parent.name)
          }

          const stopsWalk = ts.isSourceFile(parent) || isRuntimeFunctionLike(parent)

          return stopsWalk ? Option.none() : enclosingVariableNameNode(parent)
        })
      )

    const declarationNameNode = (declaration: ts.FunctionLikeDeclaration) => {
      const isFunctionDeclaration = ts.isFunctionDeclaration(declaration)
      const isFunctionExpression = ts.isFunctionExpression(declaration)
      const isMethod = ts.isMethodDeclaration(declaration)
      const namedFunctionFlags = Array.make(isFunctionDeclaration, isFunctionExpression, isMethod)
      const isNamedFunction = Array.some(namedFunctionFlags, Boolean)

      if (!isNamedFunction) {
        return enclosingVariableNameNode(declaration)
      }

      const directName = pipe(
        Option.fromNullishOr(declaration.name),
        Option.filter(ts.isIdentifier)
      )

      const hasDirectName = Option.isSome(directName)
      const keepDirectFlags = Array.make(hasDirectName, isMethod)
      const keepDirect = Array.some(keepDirectFlags, Boolean)

      return keepDirect ? directName : enclosingVariableNameNode(declaration)
    }

    const hasScopedLifecycleAncestor = (checker: ts.TypeChecker, currentNode: ts.Node) => {
      const scopedEffect = hasEffectCallAncestor(
        checker,
        currentNode,
        "Effect",
        effectLifecycleNames
      )

      const hasSuspension = hasSuspensionBoundary(checker, currentNode)
      const scopedFlags = Array.make(scopedEffect, hasSuspension)

      return Array.every(scopedFlags, Boolean)
    }

    const hasSourceFileScope = (matchContext: MatchContext, currentNode: ts.Node) => {
      const childReferencesScopedSymbol = (scopedSymbol: ts.Symbol) => (current: ts.Node) => {
        const reduceReferencedChild = (referenced: boolean, child: ts.Node) => {
          const isIdentifier = ts.isIdentifier(child)
          const notIdentifier = !isIdentifier
          const skipChild = referenced || notIdentifier

          if (skipChild) {
            return referenced
          }

          const symbol = matchContext.checker.getSymbolAtLocation(child)

          return strictEqual(scopedSymbol)(symbol)
        }

        return foldAst(reduceReferencedChild)(current)(false)
      }

      const foldAstOf = (scopedSymbol: ts.Symbol) => {
        const childReferencesScope = childReferencesScopedSymbol(scopedSymbol)

        const reduceScopedCall = (found: boolean, current: ts.Node) => {
          const isCall = ts.isCallExpression(current)
          const notCall = !isCall
          const skipNode = found || notCall

          if (skipNode) {
            return found
          }

          const isScoped = importedEffectApiAt(
            matchContext.checker,
            current.expression,
            "Effect",
            effectLifecycleNames
          )

          return isScoped ? childReferencesScope(current) : found
        }

        return foldAst(reduceScopedCall)(matchContext.sourceFile)(false)
      }

      return pipe(
        enclosingFunctionLike(currentNode),
        Option.flatMap(declarationNameNode),
        Option.flatMap(
          flow(
            (name: ts.Identifier) => matchContext.checker.getSymbolAtLocation(name),
            Option.fromNullishOr
          )
        ),
        Option.exists(foldAstOf)
      )
    }

    const externalImportedMemberAt = (checker: ts.TypeChecker, expression: ts.Expression) =>
      pipe(
        importedMemberAt(checker, expression),
        Option.filter((member) => {
          const relative = member.moduleSpecifier.startsWith(".")
          const absolute = member.moduleSpecifier.startsWith("/")
          const notRelative = !relative
          const notAbsolute = !absolute
          const externalFlags = Array.make(notRelative, notAbsolute)

          return Array.every(externalFlags, Boolean)
        })
      )

    const resourceSubjectAt = (
      matchContext: MatchContext,
      policy: FunctionalCoreEffectPolicy,
      expression: ts.CallExpression | ts.NewExpression
    ) =>
      pipe(
        externalImportedMemberAt(matchContext.checker, expression.expression),
        Option.filter((member) => {
          const lastOption = Array.last(member.path)
          const name = pipe(lastOption, Option.getOrElse(Function.constant("")))
          const factoryMatch = Array.contains(policy.resourceFactoryNames, name)

          const suffixMatch = Array.some(policy.resourceTypeSuffixes, (suffix) =>
            name.endsWith(suffix)
          )

          const isNewExpression = ts.isNewExpression(expression)
          const newSuffixMatch = isNewExpression && suffixMatch

          return factoryMatch || newSuffixMatch
        }),
        Option.map(importedMemberSubject)
      )

    const isCallOrNewExpression = (
      current: ts.Node
    ): current is ts.CallExpression | ts.NewExpression =>
      ts.isCallExpression(current) || ts.isNewExpression(current)

    const expressionOfCallOrNew = Struct.get<ts.CallExpression | ts.NewExpression, "expression">(
      "expression"
    )

    const callCapabilitySubject = (call: ts.CallExpression) => {
      const importedExpression = importedMemberAt(context.checker, call.expression)
      const expressionNotImported = Option.isNone(importedExpression)

      return pipe(
        capabilitySubjectAt(context, index.policy, call),
        Option.filter(Function.constant(expressionNotImported))
      )
    }

    const capabilityForNewExpression = (expression: ts.NewExpression) =>
      capabilitySubjectAt(context, index.policy, expression)

    const capabilityForPropertyAccess = (access: ts.PropertyAccessExpression) =>
      ambientCapabilityPropertySubject(context, access)

    const directForNode = (current: ts.Node) =>
      pipe(
        Match.value(current),
        Match.when(ts.isCallExpression, callCapabilitySubject),
        Match.when(ts.isNewExpression, capabilityForNewExpression),
        Match.when(ts.isPropertyAccessExpression, capabilityForPropertyAccess),
        Match.orElse(Option.none<string>)
      )

    const direct = directForNode(node)
    const noneSubject = Option.none<string>()
    const expressionNode = Option.liftPredicate(isCallOrNewExpression)(node)
    const nodeFallback = Function.constant(node)
    const directFallback = Function.constant(direct)
    const noneFallback = Function.constant(noneSubject)

    const subjectNode = pipe(
      expressionNode,
      Option.map(expressionOfCallOrNew),
      Option.getOrElse(nodeFallback)
    )

    const capabilityAtExpression = (expression: ts.CallExpression | ts.NewExpression) =>
      capabilitySubjectAt(context, index.policy, expression)

    const resourceAtExpression = (expression: ts.CallExpression | ts.NewExpression) =>
      resourceSubjectAt(context, index.policy, expression)

    const unsuspendedSubject = pipe(
      expressionNode,
      Option.map(capabilityAtExpression),
      Option.getOrElse(directFallback)
    )

    const unscopedSubject = pipe(
      expressionNode,
      Option.map(resourceAtExpression),
      Option.getOrElse(noneFallback)
    )

    const hasScopedLifecycle = hasScopedLifecycleAncestor(context.checker, node)
    const fileScopesFunction = hasSourceFileScope(context, node)
    const lacksScopedLifecycle = strictEqual(false)(hasScopedLifecycle)
    const lacksFileScope = strictEqual(false)(fileScopesFunction)
    const unscopedChecks = Array.make(lacksScopedLifecycle, lacksFileScope)
    const unscoped = Array.every(unscopedChecks, Boolean)
    const isExpressionNode = Option.isSome(expressionNode)
    const unscopedKeep = isExpressionNode && unscoped
    const roleForbidsCapability = capabilityForbiddenRoles[role]
    const adapterOrRoot = isAdapterOrRootRole(role)
    const hasSuspension = hasSuspensionBoundary(context.checker, subjectNode)
    const lacksSuspension = strictEqual(false)(hasSuspension)
    const unsuspendedKeep = adapterOrRoot && lacksSuspension
    const capabilityUnscopedKeep = adapterOrRoot && unscopedKeep

    const detectionsForKind = (
      capability: Option.Option<string>,
      kind: FunctionalCoreBoundaryData["kind"],
      keep: boolean
    ) => {
      const detect = (subject: string) =>
        boundaryDetection(context, subjectNode, role, kind, subject)

      return pipe(
        capability,
        Option.filter(Function.constant(keep)),
        Option.map(detect),
        Option.toArray
      )
    }

    const directCapability = detectionsForKind(direct, "direct-capability", roleForbidsCapability)

    const unsuspended = detectionsForKind(
      unsuspendedSubject,
      "unsuspended-adapter-effect",
      unsuspendedKeep
    )

    const unscopedResource = detectionsForKind(
      unscopedSubject,
      "unscoped-resource",
      capabilityUnscopedKeep
    )

    const escapingState = pipe(
      Option.liftPredicate(ts.isCallExpression)(node),
      Option.map((call) => {
        const subject = expressionSubject(context, call.expression)
        const isEscapingState = callIsEscapingState(context, call)

        const escapingStateConditions = Array.make(
          isEscapingState,
          lacksScopedLifecycle,
          lacksFileScope
        )

        const shouldReportEscaping = Array.every(escapingStateConditions, Boolean)

        const escapingStateDetection = boundaryDetection(
          context,
          call.expression,
          role,
          "escaping-runtime-state",
          subject
        )

        return detectionWhen(shouldReportEscaping, escapingStateDetection)
      }),
      Option.getOrElse(Function.constant(emptyDetections))
    )

    const groupLanes = Array.make(directCapability, unsuspended, unscopedResource, escapingState)

    return Array.flatten(groupLanes)
  }

  const contextServiceLayerPropertyNames = Array.of("layer")

  const modifierIsStatic = flow(
    Struct.get<ts.ModifierLike, "kind">("kind"),
    strictEqual(ts.SyntaxKind.StaticKeyword)
  )

  const someStaticModifier = (modifiers: readonly ts.ModifierLike[]) =>
    Array.some(modifiers, modifierIsStatic)

  const hasStaticModifier = (declaration: ts.PropertyDeclaration) =>
    pipe(Option.fromNullishOr(declaration.modifiers), Option.exists(someStaticModifier))

  const nameIsLayerProperty = (name: string) =>
    Array.contains(contextServiceLayerPropertyNames, name)

  const hasLayerStaticProperty = (declaration: ts.PropertyDeclaration) =>
    hasStaticModifier(declaration) &&
    pipe(propertyNameText(declaration.name), Option.exists(nameIsLayerProperty))

  const isContextServiceLayerProperty = (member: ts.ClassElement) =>
    ts.isPropertyDeclaration(member) && hasLayerStaticProperty(member)

  const effectServiceConfigFromExpression = (
    checker: ts.TypeChecker,
    expression: ts.Expression
  ) => {
    const current = unwrapTransparentExpression(expression)
    const isContextService = callConstructsContextApi(checker, current, contextServiceNames)
    const keepContextService = Function.constant(isContextService)

    return pipe(
      current,
      Option.liftPredicate(keepContextService),
      Option.flatMap(effectServiceMakerObject)
    )
  }

  const portLayerNames = Array.make("effect", "succeed")

  const callIsPortLayer = (context: MatchContext, node: ts.CallExpression) =>
    importedEffectApiAt(context.checker, node.expression, "Layer", portLayerNames)

  const resourceCallElements =
    (index: FunctionalCoreEffectIndex) =>
    (context: MatchContext) =>
    (node: ts.CallExpression): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> => {
      const role = nonTestRoleForSourceFile(index, context.sourceFile)

      if (Option.isNone(role)) {
        return emptyDetections
      }

      const expressionText = node.expression.getText()

      const subject = pipe(
        importedMemberAt(context.checker, node.expression),
        Option.map(importedMemberSubject),
        Option.getOrElse(Function.constant(expressionText))
      )

      const isPort = strictEqual("port")(role.value)
      const shouldReportPortLayer = isPort && callIsPortLayer(context, node)

      const portLayerDetection = boundaryDetection(
        context,
        node.expression,
        role.value,
        "port-live-implementation",
        subject
      )

      const portLayer = detectionWhen(shouldReportPortLayer, portLayerDetection)
      const adapterBoundary = adapterBoundaryDetections(index, context, node, role.value)

      return Array.appendAll(portLayer, adapterBoundary)
    }

  const resourceNewElements =
    (index: FunctionalCoreEffectIndex) =>
    (context: MatchContext) =>
    (node: ts.NewExpression): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> => {
      const role = nonTestRoleForSourceFile(index, context.sourceFile)

      return Option.match(role, {
        onNone: Function.constant(emptyDetections),
        onSome: (resolvedRole) => adapterBoundaryDetections(index, context, node, resolvedRole)
      })
    }

  const resourcePropertyElements =
    (index: FunctionalCoreEffectIndex) =>
    (context: MatchContext) =>
    (node: ts.PropertyAccessExpression): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> => {
      const role = nonTestRoleForSourceFile(index, context.sourceFile)

      return Option.match(role, {
        onNone: Function.constant(emptyDetections),
        onSome: (resolvedRole) => adapterBoundaryDetections(index, context, node, resolvedRole)
      })
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

  const callKinds = Array.of(ts.SyntaxKind.CallExpression)
  const newKinds = Array.of(ts.SyntaxKind.NewExpression)
  const propertyKinds = Array.of(ts.SyntaxKind.PropertyAccessExpression)
  const classKinds = Array.of(ts.SyntaxKind.ClassDeclaration)
  const variableKinds = Array.of(ts.SyntaxKind.VariableDeclaration)

  const portAdapterResourceLifetimeFacts = (
    index: FunctionalCoreEffectIndex
  ): ReadonlyArray<Subscription<FunctionalCoreBoundaryData>> => {
    const callSubscriptions = nodeSubscriptions(callKinds)(ts.isCallExpression)(
      resourceCallElements(index)
    )

    const newSubscriptions = nodeSubscriptions(newKinds)(ts.isNewExpression)(
      resourceNewElements(index)
    )

    const propertySubscriptions = nodeSubscriptions(propertyKinds)(ts.isPropertyAccessExpression)(
      resourcePropertyElements(index)
    )

    const classSubscriptions = nodeSubscriptions(classKinds)(ts.isClassDeclaration)(
      classDeclarationElements(index)
    )

    const variableSubscriptions = nodeSubscriptions(variableKinds)(ts.isVariableDeclaration)(
      variableDeclarationElements(index)
    )

    const subscriptions = Array.make(
      callSubscriptions,
      newSubscriptions,
      propertySubscriptions,
      classSubscriptions,
      variableSubscriptions
    )

    return Array.flatten(subscriptions)
  }

  const emptyShapeFacts = (
    _index: FunctionalCoreEffectIndex
  ): ReadonlyArray<Subscription<FunctionalCoreShapeData>> => Array.empty()

  class Feature {
    constructor(
      readonly boundaryFacts: typeof portAdapterResourceLifetimeFacts,
      readonly shapeFacts: typeof emptyShapeFacts
    ) {}
  }

  return new Feature(portAdapterResourceLifetimeFacts, emptyShapeFacts)
}

export const portAdapterResourceLifetimeFeature = makePortAdapterResourceLifetimeFeature()
