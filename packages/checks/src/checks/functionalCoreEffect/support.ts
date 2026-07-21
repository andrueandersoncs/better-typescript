import {
  Array,
  Data,
  Function,
  HashSet,
  Match,
  Option,
  Predicate,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { FunctionalCoreEffectPolicy } from "./policy.js"
import type { ArchitectureRole } from "../support/architectureRole.js"
import {
  hasExportModifier,
  isProjectFile,
  propertyNameText,
  symbolDeclarations,
  unwrapCallee,
  unwrapTransparentExpression,
  variableDeclarationInitializer
} from "../support/tsNode.js"
import { optionalStringLiteralLikeText } from "../support/stringLiteralText.js"

// ImportedMember is shared specifier and member-path pair because helpers exchange one binding.
export class ImportedMember extends Data.Class<{
  readonly moduleSpecifier: string
  readonly path: ReadonlyArray<string>
}> {}

export const importedMemberSubject = (member: ImportedMember) =>
  `${member.moduleSpecifier}:${Array.join(member.path, ".")}`

const emptyMemberPath: ReadonlyArray<string> = Array.empty()

const emptyTypeReferences: ReadonlyArray<ts.TypeReferenceNode> = Array.empty()

const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()

export const declarationsOfSymbol = (symbol: ts.Symbol): ReadonlyArray<ts.Declaration> =>
  symbolDeclarations(symbol) ?? emptyDeclarations

const emptyHeritageClauses: ReadonlyArray<ts.HeritageClause> = Array.empty()

const moduleDeclarationAncestor = (
  node: ts.Node
): Option.Option<ts.ImportDeclaration | ts.ExportDeclaration> => {
  const isModuleDeclaration = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)

  return isModuleDeclaration
    ? Option.some(node)
    : pipe(Option.fromNullishOr(node.parent), Option.flatMap(moduleDeclarationAncestor))
}

export const moduleSpecifierText = flow(
  Struct.get<ts.ImportDeclaration | ts.ExportDeclaration, "moduleSpecifier">("moduleSpecifier"),
  Option.fromNullishOr,
  optionalStringLiteralLikeText
)

const identifierEmptyPath = (identifier: ts.Identifier) => Tuple.make(identifier, emptyMemberPath)

const makePathWithMember =
  (memberName: string) => (path: readonly [ts.Identifier, ReadonlyArray<string>]) => {
    const root = Tuple.get(path, 0)
    const existing = Tuple.get(path, 1)
    const members = Array.append(existing, memberName)

    return Tuple.make(root, members)
  }

const expressionPath = (
  expression: ts.Expression
): Option.Option<readonly [ts.Identifier, ReadonlyArray<string>]> =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Match.value,
    Match.when(ts.isIdentifier, flow(identifierEmptyPath, Option.some)),
    Match.when(ts.isPropertyAccessExpression, (access) => {
      const memberName = access.name.text

      return pipe(expressionPath(access.expression), Option.map(makePathWithMember(memberName)))
    }),
    Match.when(ts.isElementAccessExpression, (access) => {
      const member = pipe(
        Option.fromNullishOr(access.argumentExpression),
        Option.filter(ts.isStringLiteralLike),
        Option.map(Struct.get("text"))
      )

      const base = expressionPath(access.expression)

      return pipe(
        Option.all({ base, member }),
        Option.map(({ base, member }) => makePathWithMember(member)(base))
      )
    }),
    Match.orElse(() => Option.none())
  )

const identifierEmptyPath2 = (identifier: ts.Identifier) => Tuple.make(identifier, emptyMemberPath)

const qualifiedNamePath = (qualifiedName: ts.QualifiedName) =>
  pipe(entityNamePath(qualifiedName.left), makePathWithMember(qualifiedName.right.text))

const entityNamePath = (name: ts.EntityName): readonly [ts.Identifier, ReadonlyArray<string>] =>
  pipe(
    Match.value(name),
    Match.when(ts.isIdentifier, identifierEmptyPath2),
    Match.orElse(qualifiedNamePath)
  )

const bindingFromNamedSpecifier = (
  moduleSpecifier: string,
  declaration: ts.ImportSpecifier | ts.ExportSpecifier
) => {
  const importedName = declaration.propertyName?.text ?? declaration.name.text
  const path = Array.of(importedName)

  return new ImportedMember({
    moduleSpecifier,
    path
  })
}

const makeNamespaceImportedMemberFromModuleSpecifier = (moduleSpecifier: string) =>
  new ImportedMember({
    moduleSpecifier,
    path: emptyMemberPath
  })

const makeDefaultImportedMemberFromModuleSpecifier = (moduleSpecifier: string) => {
  const path = Array.of("default")

  return new ImportedMember({
    moduleSpecifier,
    path
  })
}

const bindingFromDeclaration = (declaration: ts.Declaration) => {
  const moduleDeclaration = moduleDeclarationAncestor(declaration)
  const moduleSpecifier = pipe(moduleDeclaration, Option.flatMap(moduleSpecifierText))

  return pipe(
    moduleSpecifier,
    Option.flatMap((specifier) => {
      const importSpecifierBinding = (importSpecifier: ts.ImportSpecifier) =>
        bindingFromNamedSpecifier(specifier, importSpecifier)

      const exportSpecifierBinding = (exportSpecifier: ts.ExportSpecifier) =>
        bindingFromNamedSpecifier(specifier, exportSpecifier)

      const defaultBindingFromImportClause = (importClause: ts.ImportClause) =>
        pipe(
          Option.fromNullishOr(importClause.name),
          Option.map(() => makeDefaultImportedMemberFromModuleSpecifier(specifier))
        )

      return pipe(
        Match.value(declaration),
        Match.when(ts.isImportSpecifier, flow(importSpecifierBinding, Option.some)),
        Match.when(ts.isExportSpecifier, flow(exportSpecifierBinding, Option.some)),
        Match.when(
          ts.isNamespaceImport,
          flow(
            Function.constant(specifier),
            makeNamespaceImportedMemberFromModuleSpecifier,
            Option.some
          )
        ),
        Match.when(
          ts.isNamespaceExport,
          flow(
            Function.constant(specifier),
            makeNamespaceImportedMemberFromModuleSpecifier,
            Option.some
          )
        ),
        Match.when(ts.isImportClause, defaultBindingFromImportClause),
        Match.orElse(() => Option.none())
      )
    })
  )
}

const maximumBarrelDepth = 8

const declarationHasBinding = flow(bindingFromDeclaration, Option.isSome)

const someOf = (symbol: ts.Symbol) => {
  const declarations = declarationsOfSymbol(symbol)

  return Array.some(
    declarations,
    flow((candidate: ts.Declaration) => candidate.getSourceFile(), isProjectFile)
  )
}

const pipeOf2 = (symbol: ts.Symbol) =>
  pipe(declarationsOfSymbol(symbol), Array.findFirst(declarationHasBinding))

const resolvedBarrelBinding = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
  binding: ImportedMember,
  depth: number
): ImportedMember => {
  const depthExhausted = strictEqual(0)(depth)
  const pathExhausted = strictEqual(0)(binding.path.length)
  const exhausted = depthExhausted || pathExhausted

  if (exhausted) {
    return binding
  }

  const pipeOf = (moduleDeclaration: ts.ImportDeclaration | ts.ExportDeclaration) =>
    pipe(
      Option.fromNullishOr(moduleDeclaration.moduleSpecifier),
      Option.flatMap(
        flow(
          (moduleSpecifier) => checker.getSymbolAtLocation(moduleSpecifier),
          Option.fromNullishOr
        )
      )
    )

  const moduleSymbol = pipe(moduleDeclarationAncestor(declaration), Option.flatMap(pipeOf))
  const firstPartyModule = pipe(moduleSymbol, Option.exists(someOf))
  const missingModule = Option.isNone(moduleSymbol)
  const externalModule = !firstPartyModule
  const keepBinding = externalModule || missingModule

  if (keepBinding) {
    return binding
  }

  const pathHead = Array.head(binding.path)
  const importedName = pipe(pathHead, Option.getOrElse(Function.constant("")))
  const symbolNamed = flow(Struct.get<ts.Symbol, "name">("name"), strictEqual(importedName))

  const next = pipe(
    checker.getExportsOfModule(moduleSymbol.value),
    Array.findFirst(symbolNamed),
    Option.flatMap(pipeOf2),
    Option.flatMap((candidate) => {
      const makeOf = (candidateBinding: ImportedMember) => Tuple.make(candidate, candidateBinding)
      return pipe(bindingFromDeclaration(candidate), Option.map(makeOf))
    })
  )

  if (Option.isNone(next)) {
    return binding
  }

  const [nextDeclaration, nextBinding] = next.value
  const remainingPath = Array.drop(binding.path, 1)
  const path = Array.appendAll(nextBinding.path, remainingPath)

  const completeNextBinding = new ImportedMember({
    moduleSpecifier: nextBinding.moduleSpecifier,
    path
  })

  return resolvedBarrelBinding(checker, nextDeclaration, completeNextBinding, depth - 1)
}

const importBindingAt = (
  checker: ts.TypeChecker,
  identifier: ts.Identifier,
  members: ReadonlyArray<string>
) => {
  const pipeOf3 = (declaration: ts.Declaration) =>
    pipe(
      bindingFromDeclaration(declaration),
      Option.map((binding) => {
        const path = Array.appendAll(binding.path, members)

        const completeBinding = new ImportedMember({
          moduleSpecifier: binding.moduleSpecifier,
          path
        })

        return resolvedBarrelBinding(checker, declaration, completeBinding, maximumBarrelDepth)
      })
    )

  return pipe(
    checker.getSymbolAtLocation(identifier),
    Option.fromNullishOr,
    Option.map(declarationsOfSymbol),
    Option.flatMap(Array.findFirst(declarationHasBinding)),
    Option.flatMap(pipeOf3)
  )
}

const importedMemberFromPath = (
  checker: ts.TypeChecker,
  path: readonly [ts.Identifier, ReadonlyArray<string>]
) => {
  const root = Tuple.get(path, 0)
  const members = Tuple.get(path, 1)

  return importBindingAt(checker, root, members)
}

export const importedMemberAt = (checker: ts.TypeChecker, expression: ts.Expression) => {
  const memberFromPath = (path: readonly [ts.Identifier, ReadonlyArray<string>]) =>
    importedMemberFromPath(checker, path)

  return pipe(expressionPath(expression), Option.flatMap(memberFromPath))
}

export const importedTypeMemberAt = (checker: ts.TypeChecker, name: ts.EntityName) => {
  const path = entityNamePath(name)

  return importedMemberFromPath(checker, path)
}

const appendTypeReference = (
  references: ReadonlyArray<ts.TypeReferenceNode>,
  current: ts.Node
): ReadonlyArray<ts.TypeReferenceNode> =>
  ts.isTypeReferenceNode(current) ? Array.append(references, current) : references

const typeReferencesWithin = Function.flip(foldAst(appendTypeReference))(emptyTypeReferences)

const typeReferencesWithinAlias = (alias: ts.TypeAliasDeclaration) =>
  typeReferencesWithin(alias.type)

export const localTypeReferenceTargets = (
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

export const typeReferenceIsGlobalPromise = (context: CheckContext, node: ts.TypeReferenceNode) => {
  const someOf2 = (declarations: ReadonlyArray<ts.Declaration>) =>
    Array.some(
      declarations,
      flow(
        (declaration: ts.Declaration) => declaration.getSourceFile(),
        (sourceFile: ts.SourceFile) => context.program.isSourceFileDefaultLibrary(sourceFile)
      )
    )

  const typeNameIsPromise = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("Promise"))

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

export const specifierIsEffect = strictEqual("effect")

export const effectApiMember = (
  member: ImportedMember,
  namespace: string,
  names: ReadonlyArray<string>
) => {
  const lastOption = Array.last(member.path)
  const last = pipe(lastOption, Option.getOrElse(Function.constant("")))
  const pathHead = Array.get(member.path, 0)
  const fromBarrelPath = pipe(pathHead, Option.contains(namespace))
  const fromEffectBarrel = strictEqual("effect")(member.moduleSpecifier)
  const fromBarrel = fromEffectBarrel && fromBarrelPath
  const fromSubpath = strictEqual(`effect/${namespace}`)(member.moduleSpecifier)
  const fromEffectModule = fromBarrel || fromSubpath
  const nameMatches = Array.contains(names, last)
  const matchFlags = Array.make(fromEffectModule, nameMatches)

  return Array.every(matchFlags, Boolean)
}

export const importedEffectApiAt = (
  checker: ts.TypeChecker,
  expression: ts.Expression,
  namespace: string,
  names: ReadonlyArray<string>
) => {
  const effectApiMemberOf = (member: ImportedMember) => effectApiMember(member, namespace, names)
  return pipe(importedMemberAt(checker, expression), Option.exists(effectApiMemberOf))
}

const isEffectManagedRuntimeSource = (sourceFile: ts.SourceFile) => {
  const normalized = sourceFile.fileName.replaceAll("\\", "/")

  const installed =
    normalized.includes("/node_modules/effect/") && normalized.endsWith("/ManagedRuntime.d.ts")

  const vendored = normalized.endsWith("/packages/effect/src/ManagedRuntime.ts")

  return installed || vendored
}

const someOf3 = (declarations: ReadonlyArray<ts.Declaration>) =>
  Array.some(
    declarations,
    flow((declaration: ts.Declaration) => declaration.getSourceFile(), isEffectManagedRuntimeSource)
  )

export const isManagedRuntimeMethodAccess = (
  checker: ts.TypeChecker,
  node: ts.PropertyAccessExpression,
  names: ReadonlyArray<string>
) => {
  const nameMatches = Array.contains(names, node.name.text)

  const managedRuntime = pipe(
    node.name,
    (nameNode) => checker.getSymbolAtLocation(nameNode),
    Option.fromNullishOr,
    Option.map(declarationsOfSymbol),
    Option.exists(someOf3)
  )

  const matchFlags = Array.make(nameMatches, managedRuntime)

  return Array.every(matchFlags, Boolean)
}

export const classExtendsEffectApi = (
  checker: ts.TypeChecker,
  declaration: ts.ClassDeclaration,
  namespace: string,
  memberName: string
) => {
  const clauses = declaration.heritageClauses ?? emptyHeritageClauses
  const names = Array.of(memberName)

  const someOf4 = (clause: ts.HeritageClause) =>
    Array.some(clause.types, (heritage) => {
      const callee = unwrapCallee(heritage.expression)
      return importedEffectApiAt(checker, callee, namespace, names)
    })

  return Array.some(clauses, someOf4)
}

const effectServiceMakerObject = (
  expression: ts.Expression
): Option.Option<ts.ObjectLiteralExpression> => {
  if (!ts.isCallExpression(expression)) {
    return Option.none()
  }

  const makerArgument = Array.get(expression.arguments, 1)
  const maker = pipe(makerArgument, Option.filter(ts.isObjectLiteralExpression))

  return Option.isSome(maker) ? maker : effectServiceMakerObject(expression.expression)
}

const contextServiceNames = Array.of("Service")

const makerObjectFromHeritage = (heritage: ts.ExpressionWithTypeArguments) =>
  effectServiceMakerObject(heritage.expression)

export const effectServiceConfigObject = (
  checker: ts.TypeChecker,
  declaration: ts.ClassDeclaration
) => {
  const importedEffectApiAtOf = (callee: ts.Expression) =>
    importedEffectApiAt(checker, callee, "Context", contextServiceNames)

  const heritageTypesOf = (clause: ts.HeritageClause) => Array.fromIterable(clause.types)

  const unwrapHeritageCallee = (heritage: ts.ExpressionWithTypeArguments) =>
    unwrapCallee(heritage.expression)

  return pipe(
    declaration.heritageClauses ?? emptyHeritageClauses,
    Array.flatMap(heritageTypesOf),
    Array.findFirst(flow(unwrapHeritageCallee, importedEffectApiAtOf)),
    Option.flatMap(makerObjectFromHeritage)
  )
}

const adapterOrRootRoles = HashSet.make("adapter" as ArchitectureRole, "root" as ArchitectureRole)

export const isAdapterOrRootRole = (role: ArchitectureRole) => HashSet.has(adapterOrRootRoles, role)

export const propertyAssignmentNamed = (
  object: ts.ObjectLiteralExpression,
  names: ReadonlyArray<string>
) => {
  const nameIsListed = (name: string) => Array.contains(names, name)

  const isPropertyAssignmentOf = (property: ts.ObjectLiteralElementLike) =>
    ts.isPropertyAssignment(property) &&
    pipe(propertyNameText(property.name), Option.exists(nameIsListed))

  return Array.findFirst(object.properties, isPropertyAssignmentOf)
}

const contextServiceLayerPropertyNames = Array.of("layer")

const modifierIsStatic = flow(
  Struct.get<ts.ModifierLike, "kind">("kind"),
  strictEqual(ts.SyntaxKind.StaticKeyword)
)

const someOf5 = (modifiers: readonly ts.ModifierLike[]) => Array.some(modifiers, modifierIsStatic)

const hasStaticModifier = (declaration: ts.PropertyDeclaration) =>
  pipe(Option.fromNullishOr(declaration.modifiers), Option.exists(someOf5))

const nameIsListed2 = (name: string) => Array.contains(contextServiceLayerPropertyNames, name)

const hasLayerStaticProperty = (declaration: ts.PropertyDeclaration) =>
  hasStaticModifier(declaration) &&
  pipe(propertyNameText(declaration.name), Option.exists(nameIsListed2))

const isPropertyDeclarationOf = (member: ts.ClassElement) =>
  ts.isPropertyDeclaration(member) && hasLayerStaticProperty(member)

export const contextServiceLayerProperty = (declaration: ts.ClassDeclaration) => {
  const members = declaration.members
  return Array.findFirst(members, isPropertyDeclarationOf)
}

const contextReferenceNames = Array.of("Reference")

const resolvedSymbolAtNode = (checker: ts.TypeChecker) => (node: ts.Node) =>
  pipe(
    checker.getSymbolAtLocation(node),
    Option.fromNullishOr,
    Option.map((symbol) => {
      const alias = (symbol.flags & ts.SymbolFlags.Alias) !== 0
      return alias ? checker.getAliasedSymbol(symbol) : symbol
    })
  )

const callConstructsContextApi = (
  checker: ts.TypeChecker,
  expression: ts.Expression,
  names: ReadonlyArray<string>
): boolean => {
  const current = unwrapTransparentExpression(expression)

  if (!ts.isCallExpression(current)) {
    return importedEffectApiAt(checker, current, "Context", names)
  }

  const callee = unwrapCallee(current.expression)
  const direct = importedEffectApiAt(checker, callee, "Context", names)
  return direct || callConstructsContextApi(checker, current.expression, names)
}

const declarationInitializesContextApi = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
  names: ReadonlyArray<string>
) => {
  const callConstructsContextApiOf = (initializer: ts.Expression) =>
    callConstructsContextApi(checker, initializer, names)

  return pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(declaration),
    Option.flatMap(variableDeclarationInitializer),
    Option.exists(callConstructsContextApiOf)
  )
}

export const declarationIsContextService = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration
) => {
  const classExtendsEffectApiOf = (classDeclaration: ts.ClassDeclaration) =>
    classExtendsEffectApi(checker, classDeclaration, "Context", "Service")

  return (
    pipe(
      Option.liftPredicate(ts.isClassDeclaration)(declaration),
      Option.exists(classExtendsEffectApiOf)
    ) || declarationInitializesContextApi(checker, declaration, contextServiceNames)
  )
}

const declarationIsContextReference = (checker: ts.TypeChecker, declaration: ts.Declaration) =>
  declarationInitializesContextApi(checker, declaration, contextReferenceNames)

export const expressionIsServiceTag = (checker: ts.TypeChecker, expression: ts.Expression) => {
  const declarationIsContextServiceOf = (declaration: ts.Declaration) =>
    declarationIsContextService(checker, declaration) ||
    declarationIsContextReference(checker, declaration)

  const someOf6 = (declarations: ReadonlyArray<ts.Declaration>) =>
    Array.some(declarations, declarationIsContextServiceOf)

  return pipe(
    expression,
    unwrapTransparentExpression,
    resolvedSymbolAtNode(checker),
    Option.map(declarationsOfSymbol),
    Option.exists(someOf6)
  )
}

const provideServiceNames = Array.of("provideService")

const provideServiceTagArgument = (node: ts.CallExpression) => {
  const args = Array.fromIterable(node.arguments)
  const tagIndex = args.length >= 3 ? 1 : 0

  return Array.get(args, tagIndex)
}

export const callIsReferenceProvideService = (checker: ts.TypeChecker, node: ts.CallExpression) => {
  const isProvideService = importedEffectApiAt(
    checker,
    node.expression,
    "Effect",
    provideServiceNames
  )

  const declarationIsContextReferenceCheck = (declaration: ts.Declaration) =>
    declarationIsContextReference(checker, declaration)

  const someOf7 = (declarations: ReadonlyArray<ts.Declaration>) =>
    Array.some(declarations, declarationIsContextReferenceCheck)

  const referenceOverride = pipe(
    provideServiceTagArgument(node),
    Option.map(unwrapTransparentExpression),
    Option.flatMap(resolvedSymbolAtNode(checker)),
    Option.map(declarationsOfSymbol),
    Option.exists(someOf7)
  )

  const checks = Array.make(isProvideService, referenceOverride)

  return Array.every(checks, Boolean)
}

export const expressionIsEffectRuntimeRunner = (
  checker: ts.TypeChecker,
  expression: ts.Expression,
  runtimeNames: ReadonlyArray<string>
) => {
  const current = unwrapTransparentExpression(expression)
  const direct = importedEffectApiAt(checker, current, "Effect", runtimeNames)

  const importedEffectApiAtOf2 = (call: ts.CallExpression) =>
    importedEffectApiAt(checker, call.expression, "Effect", runtimeNames)

  const curried = pipe(
    Option.liftPredicate(ts.isCallExpression)(current),
    Option.exists(importedEffectApiAtOf2)
  )

  const checks = Array.make(direct, curried)

  return Array.some(checks, Boolean)
}

export const callIsPipeRuntimeHandoff = (
  checker: ts.TypeChecker,
  node: ts.CallExpression,
  runtimeNames: ReadonlyArray<string>
) => {
  const callee = unwrapTransparentExpression(node.expression)

  const accessIsNamedPipe = (access: ts.PropertyAccessExpression) =>
    strictEqual("pipe")(access.name.text)

  const isPipe = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(callee),
    Option.exists(accessIsNamedPipe)
  )

  const expressionIsEffectRuntimeRunnerOf = (argument: ts.Expression) =>
    expressionIsEffectRuntimeRunner(checker, argument, runtimeNames)

  const hasRunner = Array.some(node.arguments, expressionIsEffectRuntimeRunnerOf)
  const checks = Array.make(isPipe, hasRunner)

  return Array.every(checks, Boolean)
}

const effectBarrelPlatformCapabilityNames: Readonly<Record<string, true>> = {
  FileSystem: true,
  Terminal: true,
  Path: true
}

const unstableHttpNamespaces = Array.make("http", "httpapi")

const nameIsListed3 = (name: string) => Array.contains(unstableHttpNamespaces, name)

const isMovedPlatformCapabilityName = (name: string) =>
  strictEqual(true)(effectBarrelPlatformCapabilityNames[name])

export const importedMemberIsMovedPlatformCapability = (member: ImportedMember) => {
  const fromEffectBarrel = strictEqual("effect")(member.moduleSpecifier)
  const pathHead = Array.get(member.path, 0)
  const pathSecond = Array.get(member.path, 1)
  const isMovedBarrelMember = pipe(pathHead, Option.exists(isMovedPlatformCapabilityName))
  const barrelChecks = Array.make(fromEffectBarrel, isMovedBarrelMember)
  const fromBarrel = Array.every(barrelChecks, Boolean)
  const isUnstableNamespace = pipe(pathHead, Option.contains("unstable"))
  const isHttpNamespace = pipe(pathSecond, Option.exists(nameIsListed3))
  const unstableChecks = Array.make(fromEffectBarrel, isUnstableNamespace, isHttpNamespace)
  const fromUnstableHttp = Array.every(unstableChecks, Boolean)
  const capabilitySources = Array.make(fromBarrel, fromUnstableHttp)

  return Array.some(capabilitySources, Boolean)
}

export const effectServiceConfigFromExpression = (
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

export const resolvedModuleSourceFile = (
  context: CheckContext,
  declaration: ts.ImportDeclaration | ts.ExportDeclaration
) => {
  const moduleSpecifier = declaration.moduleSpecifier

  const findFirstOf = (declarations: ReadonlyArray<ts.Declaration>) =>
    Array.findFirst(declarations, ts.isSourceFile)

  const pipeOf4 = (specifier: ts.Node) =>
    pipe(
      context.checker.getSymbolAtLocation(specifier),
      Option.fromNullishOr,
      Option.map(declarationsOfSymbol),
      Option.flatMap(findFirstOf)
    )

  const checkerSource = pipe(Option.fromNullishOr(moduleSpecifier), Option.flatMap(pipeOf4))

  if (Option.isSome(checkerSource)) {
    return checkerSource
  }

  const specifier = pipe(
    Option.fromNullishOr(moduleSpecifier),
    Option.filter(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )

  const pipeOf5 = (resolved: ts.ResolvedModuleFull) =>
    pipe(context.program.getSourceFile(resolved.resolvedFileName), Option.fromNullishOr)

  return pipe(
    specifier,
    Option.flatMap((text) => {
      const compilerOptions = context.program.getCompilerOptions()

      const resolution = ts.resolveModuleName(
        text,
        context.sourceFile.fileName,
        compilerOptions,
        ts.sys
      )

      return Option.fromNullishOr(resolution.resolvedModule)
    }),
    Option.flatMap(pipeOf5)
  )
}

export const moduleMatchesPolicyPrefix = (
  policy: FunctionalCoreEffectPolicy,
  moduleSpecifier: string
) =>
  Array.some(policy.capabilityModulePrefixes, (prefix) => {
    const namespacePrefix = prefix.endsWith(":")
    const namespaceMatch = namespacePrefix && moduleSpecifier.startsWith(prefix)
    const packagePrefix = `${prefix}/`
    const exactPackage = strictEqual(prefix)(moduleSpecifier)
    const nestedPackage = moduleSpecifier.startsWith(packagePrefix)
    const packageMatch = exactPackage || nestedPackage
    const matchFlags = Array.make(namespaceMatch, packageMatch)

    return Array.some(matchFlags, Boolean)
  })

const namedImportsHaveRuntimeValue = (bindings: ts.NamedImports) =>
  Array.some(bindings.elements, (specifier) => !specifier.isTypeOnly)

export const importHasRuntimeValue = (declaration: ts.ImportDeclaration) =>
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
                Match.value(bindings),
                Match.when(ts.isNamespaceImport, Function.constTrue),
                Match.when(ts.isNamedImports, namedImportsHaveRuntimeValue),
                Match.exhaustive
              )
          })
        )

        const hasRuntimeBinding = hasDefaultName || hasNamedRuntime
        const matchFlags = Array.make(isValueImport, hasRuntimeBinding)

        return Array.every(matchFlags, Boolean)
      }
    })
  )

const symbolIsAmbient = (checker: ts.TypeChecker, identifier: ts.Identifier) =>
  pipe(
    checker.getSymbolAtLocation(identifier),
    Option.fromNullishOr,
    Option.map(declarationsOfSymbol),
    Option.exists((declarations) => {
      const hasDeclaration = declarations.length > 0

      const hasProjectDeclaration = Array.some(
        declarations,
        flow((declaration) => declaration.getSourceFile(), isProjectFile)
      )

      const notProjectDeclaration = !hasProjectDeclaration
      const ambientFlags = Array.make(hasDeclaration, notProjectDeclaration)

      return Array.every(ambientFlags, Boolean)
    })
  )

const ambientPathAt = (
  checker: ts.TypeChecker,
  expression: ts.Expression
): Option.Option<ReadonlyArray<string>> => {
  const pathRootIsAmbient = (path: readonly [ts.Identifier, ReadonlyArray<string>]) => {
    const root = Tuple.get(path, 0)

    return symbolIsAmbient(checker, root)
  }

  const ambientPathSegments = (path: readonly [ts.Identifier, ReadonlyArray<string>]) => {
    const root = Tuple.get(path, 0)
    const members = Tuple.get(path, 1)

    return Array.prepend(members, root.text)
  }

  return pipe(
    expressionPath(expression),
    Option.filter(pathRootIsAmbient),
    Option.map(ambientPathSegments)
  )
}

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

export const capabilitySubjectAt = (
  context: CheckContext,
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

const pathTextEquals2 = flow(Array.join("."), strictEqual("process.env"))

export const ambientCapabilityPropertySubject = (
  context: CheckContext,
  node: ts.PropertyAccessExpression
) =>
  pipe(
    ambientPathAt(context.checker, node),
    Option.filter(pathTextEquals2),
    Option.map(Array.join("."))
  )

const suspensionNames = Array.make("callback", "promise", "suspend", "sync", "try", "tryPromise")

const effectLifecycleNames = Array.make(
  "acquireRelease",
  "acquireUseRelease",
  "acquireDisposable",
  "addFinalizer"
)

const tryEffectNames = Array.make("try", "tryPromise")

const runtimeFunctionLikeKinds = HashSet.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor
)

export const isRuntimeFunctionLike = (node: ts.Node): node is ts.FunctionLikeDeclaration =>
  HashSet.has(runtimeFunctionLikeKinds, node.kind)

const isSuspensionCallbackDeclaration = (
  checker: ts.TypeChecker,
  declaration: ts.FunctionLikeDeclaration
) => {
  const parent = declaration.parent

  if (ts.isCallExpression(parent)) {
    const argumentIsDeclaration = strictEqual(declaration)
    const isArgument = Array.some(parent.arguments, argumentIsDeclaration)
    const isSuspension = importedEffectApiAt(checker, parent.expression, "Effect", suspensionNames)

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
    Option.liftPredicate(ts.isPropertyAssignment)(parent),
    Option.filter(assignmentInitializesDeclaration),
    Option.flatMap(pipeOf7),
    Option.getOrElse(Function.constFalse)
  )
}

export const hasSuspensionBoundary = (checker: ts.TypeChecker, node: ts.Node) => {
  const visit = (current: ts.Node): boolean => {
    const isSuspensionCallback =
      isRuntimeFunctionLike(current) && isSuspensionCallbackDeclaration(checker, current)

    return isSuspensionCallback
      ? true
      : pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
  }

  return visit(node)
}

export const hasEffectCallAncestor = (
  checker: ts.TypeChecker,
  node: ts.Node,
  namespace: string,
  names: ReadonlyArray<string>
) => {
  const visit = (current: ts.Node): boolean => {
    const matchingCall =
      ts.isCallExpression(current) &&
      importedEffectApiAt(checker, current.expression, namespace, names)

    return matchingCall ? true : pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
  }

  return visit(node)
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

export const resourceSubjectAt = (
  context: CheckContext,
  policy: FunctionalCoreEffectPolicy,
  node: ts.CallExpression | ts.NewExpression
) =>
  pipe(
    externalImportedMemberAt(context.checker, node.expression),
    Option.filter((member) => {
      const lastOption = Array.last(member.path)
      const name = pipe(lastOption, Option.getOrElse(Function.constant("")))
      const factoryMatch = Array.contains(policy.resourceFactoryNames, name)
      const suffixMatch = Array.some(policy.resourceTypeSuffixes, (suffix) => name.endsWith(suffix))
      const isNewExpression = ts.isNewExpression(node)
      const newSuffixMatch = isNewExpression && suffixMatch

      return factoryMatch || newSuffixMatch
    }),
    Option.map(importedMemberSubject)
  )

export const hasScopedLifecycleAncestor = (checker: ts.TypeChecker, node: ts.Node) => {
  const scopedEffect = hasEffectCallAncestor(checker, node, "Effect", effectLifecycleNames)
  const hasSuspension = hasSuspensionBoundary(checker, node)
  const scopedFlags = Array.make(scopedEffect, hasSuspension)

  return Array.every(scopedFlags, Boolean)
}

const runtimeFunctionLikeFrom = (parent: ts.Node) =>
  isRuntimeFunctionLike(parent) ? Option.some(parent) : enclosingFunctionLike(parent)

export const enclosingFunctionLike = (node: ts.Node): Option.Option<ts.FunctionLikeDeclaration> =>
  pipe(Option.fromNullishOr(node.parent), Option.flatMap(runtimeFunctionLikeFrom))

const enclosingVariableNameNode = (node: ts.Node): Option.Option<ts.Identifier> =>
  pipe(
    Option.fromNullishOr(node.parent),
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

  const directName = pipe(Option.fromNullishOr(declaration.name), Option.filter(ts.isIdentifier))
  const hasDirectName = Option.isSome(directName)
  const keepDirectFlags = Array.make(hasDirectName, isMethod)
  const keepDirect = Array.some(keepDirectFlags, Boolean)

  return keepDirect ? directName : enclosingVariableNameNode(declaration)
}

export const hasSourceFileScope = (context: CheckContext, node: ts.Node) => {
  const foldAstOf = (scopedSymbol: ts.Symbol) =>
    foldAst((found: boolean, current: ts.Node): boolean => {
      const isCall = ts.isCallExpression(current)
      const notCall = !isCall
      const skipNode = found || notCall

      if (skipNode) {
        return found
      }

      const isScoped = importedEffectApiAt(
        context.checker,
        current.expression,
        "Effect",
        effectLifecycleNames
      )

      if (!isScoped) {
        return found
      }

      return foldAst((referenced: boolean, child: ts.Node): boolean => {
        const isIdentifier = ts.isIdentifier(child)
        const notIdentifier = !isIdentifier
        const skipChild = referenced || notIdentifier

        if (skipChild) {
          return referenced
        }

        const symbol = context.checker.getSymbolAtLocation(child)

        return strictEqual(scopedSymbol)(symbol)
      })(current)(false)
    })(context.sourceFile)(false)

  return pipe(
    enclosingFunctionLike(node),
    Option.flatMap(declarationNameNode),
    Option.flatMap(
      flow((name: ts.Identifier) => context.checker.getSymbolAtLocation(name), Option.fromNullishOr)
    ),
    Option.exists(foldAstOf)
  )
}

export const isTopLevelExportedDeclaration = (node: ts.Node) => {
  const visitParent = (current: ts.Node): boolean =>
    pipe(
      Option.fromNullishOr(current.parent),
      Option.filter(Predicate.not(ts.isSourceFile)),
      Option.exists(visit)
    )

  const statementIsTopLevel = (statement: ts.Statement) =>
    strictEqual(ts.SyntaxKind.SourceFile)(statement.parent.kind)

  const visit = (current: ts.Node): boolean =>
    pipe(
      Option.liftPredicate(ts.isStatement)(current),
      Option.filter(statementIsTopLevel),
      Option.match({
        onNone: () => visitParent(current),
        onSome: hasExportModifier
      })
    )

  return visit(node)
}
