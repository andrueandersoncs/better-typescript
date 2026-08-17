import { Array, Function, HashSet, Match, Option, Struct, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { Match as FactMatch } from "../../matcher/match.js"
import type { MatchContext } from "../../matcher/matchContext.js"
import type { Subscription } from "../../matcher/subscription.js"
import { nodeSubscriptions } from "../../matcher/nodeSubscriptions.js"
import { FunctionalCoreBoundaryData } from "./boundaryData.js"
import type { FunctionalCoreShapeData } from "./shapeData.js"
import { boundaryDetection } from "./boundaryDetection.js"
import type { ArchitectureRole } from "../../support/architectureRoleType.js"
import type { FunctionalCoreEffectIndex } from "./functionalCoreEffectIndexClass.js"
import type { FunctionalCoreEffectPolicy } from "./functionalCoreEffectPolicyClass.js"
import { roleForSourceFile } from "./roleForSourceFile.js"
import { importedTypeMemberAt } from "./importedTypeMemberAt.js"
import { importedMemberSubject } from "./importedMemberSubject.js"
import type { ImportedMember } from "./importedMember.js"
import { effectApiMember } from "./effectApiMember.js"
import { moduleMatchesPolicyPrefix } from "./moduleMatchesPolicyPrefix.js"
import { isTopLevelExportedDeclaration } from "./isTopLevelExportedDeclaration.js"
import { detectionWhen } from "./detectionWhen.js"
import { emptyDetections } from "./emptyDetections.js"
import { specifierIsEffect } from "./specifierIsEffect.js"
import { foldAst } from "../../sources/foldAst.js"
import { isProjectFile } from "../../support/isProjectFile.js"
import { declarationsOfSymbol } from "./declarationsOfSymbol.js"

const makeImportTypeResolutionFeature = () => {
  const emptyNamespace = Function.constant("")
  const emptySymbols: ReadonlyArray<ts.Symbol> = Array.empty()
  const emptyTypeReferences: ReadonlyArray<ts.TypeReferenceNode> = Array.empty()

  const appendTypeReference = (
    references: ReadonlyArray<ts.TypeReferenceNode>,
    current: ts.Node
  ): ReadonlyArray<ts.TypeReferenceNode> =>
    ts.isTypeReferenceNode(current) ? Array.append(references, current) : references

  const typeReferencesWithin = Function.flip(foldAst(appendTypeReference))(emptyTypeReferences)

  const typeReferencesWithinAlias = (alias: ts.TypeAliasDeclaration) =>
    typeReferencesWithin(alias.type)

  const localTypeReferenceTargets = (
    checker: ts.TypeChecker,
    node: ts.TypeReferenceNode
  ): ReadonlyArray<ts.TypeReferenceNode> =>
    pipe(
      checker.getSymbolAtLocation(node.typeName),
      Option.fromNullishOr,
      Option.map((symbol) => {
        const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

        return isAlias ? checker.getAliasedSymbol(symbol) : symbol
      }),
      Option.map(declarationsOfSymbol),
      Option.map(
        Array.flatMap((declaration): ReadonlyArray<ts.TypeReferenceNode> => {
          const sourceFile = declaration.getSourceFile()
          const isProject = isProjectFile(sourceFile)

          if (!isProject) {
            return emptyTypeReferences
          }

          return pipe(
            Match.value(declaration),
            Match.when(ts.isTypeAliasDeclaration, typeReferencesWithinAlias),
            Match.when(ts.isInterfaceDeclaration, typeReferencesWithin),
            Match.orElse(Function.constant(emptyTypeReferences))
          )
        })
      ),
      Option.getOrElse(Function.constant(emptyTypeReferences))
    )

  const typeReferenceIsGlobalPromise = (context: MatchContext, node: ts.TypeReferenceNode) => {
    const someOf2 = (declarations: ReadonlyArray<ts.Declaration>) =>
      Array.some(
        declarations,
        flow(
          (declaration: ts.Declaration) => declaration.getSourceFile(),
          (sourceFile: ts.SourceFile) => context.program.isSourceFileDefaultLibrary(sourceFile)
        )
      )

    const typeNameIsPromise = flow(
      Struct.get<ts.Identifier, "text">("text"),
      strictEqual("Promise")
    )

    return pipe(
      Option.liftPredicate(ts.isIdentifier)(node.typeName),
      Option.filter(typeNameIsPromise),
      Option.flatMap(
        flow((typeName) => context.checker.getSymbolAtLocation(typeName), Option.fromNullishOr)
      ),
      Option.map(declarationsOfSymbol),
      Option.exists(someOf2)
    )
  }

  const contextTypeNames = Array.of("Context")
  const managedRuntimeTypeNames = Array.of("ManagedRuntime")
  const isDomainArchitectureRole = strictEqual("domain" as ArchitectureRole)

  const domainRoleForSourceFile = (index: FunctionalCoreEffectIndex, sourceFile: ts.SourceFile) =>
    pipe(roleForSourceFile(index, sourceFile), Option.filter(isDomainArchitectureRole))

  const forbiddenContractEffectNamespaces = HashSet.make(
    "Ref",
    "SynchronizedRef",
    "Queue",
    "PubSub",
    "SubscriptionRef",
    "References",
    "Runtime",
    "ManagedRuntime",
    "Latch",
    "Semaphore"
  )

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
        const stateOrRuntime = HashSet.has(forbiddenContractEffectNamespaces, effectNamespace)
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

        const managedRuntimeType = effectApiMember(
          member,
          "ManagedRuntime",
          managedRuntimeTypeNames
        )

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

  const typeReferenceKinds = Array.of(ts.SyntaxKind.TypeReference)
  const asyncKeywordKinds = Array.of(ts.SyntaxKind.AsyncKeyword)

  const importTypeResolutionFacts = (
    index: FunctionalCoreEffectIndex
  ): ReadonlyArray<Subscription<FunctionalCoreBoundaryData>> => {
    const typeReferenceSubscriptions = nodeSubscriptions(typeReferenceKinds)(
      ts.isTypeReferenceNode
    )(typeReferenceElements(index))

    const asyncSubscriptions = nodeSubscriptions(asyncKeywordKinds)(isAsyncKeyword)(
      asyncKeywordElements(index)
    )

    return Array.appendAll(typeReferenceSubscriptions, asyncSubscriptions)
  }

  const emptyShapeFacts = (
    _index: FunctionalCoreEffectIndex
  ): ReadonlyArray<Subscription<FunctionalCoreShapeData>> => Array.empty()

  class Feature {
    constructor(
      readonly boundaryFacts: typeof importTypeResolutionFacts,
      readonly shapeFacts: typeof emptyShapeFacts
    ) {}
  }

  return new Feature(importTypeResolutionFacts, emptyShapeFacts)
}

export const importTypeResolutionFeature = makeImportTypeResolutionFeature()
