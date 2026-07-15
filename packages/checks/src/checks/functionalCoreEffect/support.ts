import { Array, Data, Function, Option, Predicate, Struct, Tuple, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { ArchitectureRole } from "./data.js"
import type { FunctionalCoreEffectIndex } from "./index.js"
import { roleForSourceFile } from "./index.js"
import type { FunctionalCoreEffectPolicy } from "./policy.js"
import {
  hasExportModifier,
  isProjectFile,
  unwrapCallee,
  unwrapTransparentExpression
} from "../support/tsNode.js"

export class ImportedMember extends Data.Class<{
  readonly moduleSpecifier: string
  readonly path: ReadonlyArray<string>
}> {}

class ImportBinding extends Data.Class<{
  readonly moduleSpecifier: string
  readonly path: ReadonlyArray<string>
}> {}

type ExpressionPath = readonly [ts.Identifier, ReadonlyArray<string>]

type ImportOrExportDeclaration = ts.ImportDeclaration | ts.ExportDeclaration

const moduleDeclarationAncestor = (node: ts.Node): Option.Option<ImportOrExportDeclaration> => {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return Option.some(node)
  }

  return pipe(Option.fromNullable(node.parent), Option.flatMap(moduleDeclarationAncestor))
}

export const moduleSpecifierText = (
  declaration: ts.ImportDeclaration | ts.ExportDeclaration
): Option.Option<string> =>
  pipe(
    Option.fromNullable(declaration.moduleSpecifier),
    Option.filter(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )

const expressionPath = (expression: ts.Expression): Option.Option<ExpressionPath> => {
  const unwrapped = unwrapTransparentExpression(expression)

  if (ts.isIdentifier(unwrapped)) {
    return Option.some(Tuple.make(unwrapped, Array.empty<string>()))
  }

  if (ts.isPropertyAccessExpression(unwrapped)) {
    return pipe(
      expressionPath(unwrapped.expression),
      Option.map(([root, members]) => Tuple.make(root, Array.append(members, unwrapped.name.text)))
    )
  }

  if (ts.isElementAccessExpression(unwrapped)) {
    const member = pipe(
      Option.fromNullable(unwrapped.argumentExpression),
      Option.filter(ts.isStringLiteralLike),
      Option.map(Struct.get("text"))
    )

    return pipe(
      Option.all({ base: expressionPath(unwrapped.expression), member }),
      Option.map(({ base: [root, members], member }) =>
        Tuple.make(root, Array.append(members, member))
      )
    )
  }

  return Option.none()
}

const entityNamePath = (name: ts.EntityName): ExpressionPath => {
  if (ts.isIdentifier(name)) {
    return Tuple.make(name, Array.empty<string>())
  }

  const [root, members] = entityNamePath(name.left)
  return Tuple.make(root, Array.append(members, name.right.text))
}

const bindingFromDeclaration = (declaration: ts.Declaration): Option.Option<ImportBinding> => {
  const moduleDeclaration = moduleDeclarationAncestor(declaration)

  const moduleSpecifier = pipe(moduleDeclaration, Option.flatMap(moduleSpecifierText))

  if (Option.isNone(moduleSpecifier)) {
    return Option.none()
  }

  if (ts.isImportSpecifier(declaration) || ts.isExportSpecifier(declaration)) {
    const importedName = declaration.propertyName?.text ?? declaration.name.text

    return Option.some(
      new ImportBinding({
        moduleSpecifier: moduleSpecifier.value,
        path: Array.of(importedName)
      })
    )
  }

  if (ts.isNamespaceImport(declaration) || ts.isNamespaceExport(declaration)) {
    return Option.some(
      new ImportBinding({
        moduleSpecifier: moduleSpecifier.value,
        path: Array.empty()
      })
    )
  }

  if (ts.isImportClause(declaration) && declaration.name !== undefined) {
    return Option.some(
      new ImportBinding({
        moduleSpecifier: moduleSpecifier.value,
        path: Array.of("default")
      })
    )
  }

  return Option.none()
}

const maximumBarrelDepth = 8

const resolvedBarrelBinding = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
  binding: ImportBinding,
  depth: number
): ImportBinding => {
  if (depth === 0 || binding.path.length === 0) {
    return binding
  }

  const moduleSymbol = pipe(
    moduleDeclarationAncestor(declaration),
    Option.flatMap((moduleDeclaration) =>
      pipe(
        Option.fromNullable(moduleDeclaration.moduleSpecifier),
        Option.flatMap((moduleSpecifier) =>
          pipe(checker.getSymbolAtLocation(moduleSpecifier), Option.fromNullable)
        )
      )
    )
  )

  const firstPartyModule = pipe(
    moduleSymbol,
    Option.exists((symbol) =>
      Array.some(symbol.declarations ?? Array.empty(), (candidate) =>
        isProjectFile(candidate.getSourceFile())
      )
    )
  )

  if (!firstPartyModule || Option.isNone(moduleSymbol)) {
    return binding
  }

  const importedName = pipe(Array.head(binding.path), Option.getOrElse(Function.constant("")))

  const next = pipe(
    checker.getExportsOfModule(moduleSymbol.value),
    Array.findFirst((symbol) => symbol.name === importedName),
    Option.flatMap((symbol) =>
      pipe(
        symbol.declarations ?? Array.empty(),
        Array.findFirst((candidate) => Option.isSome(bindingFromDeclaration(candidate)))
      )
    ),
    Option.flatMap((candidate) =>
      pipe(
        bindingFromDeclaration(candidate),
        Option.map((candidateBinding) => Tuple.make(candidate, candidateBinding))
      )
    )
  )

  if (Option.isNone(next)) {
    return binding
  }

  const [nextDeclaration, nextBinding] = next.value
  const remainingPath = Array.drop(binding.path, 1)

  const completeNextBinding = new ImportBinding({
    moduleSpecifier: nextBinding.moduleSpecifier,
    path: Array.appendAll(nextBinding.path, remainingPath)
  })

  return resolvedBarrelBinding(checker, nextDeclaration, completeNextBinding, depth - 1)
}

const importBindingAt = (
  checker: ts.TypeChecker,
  identifier: ts.Identifier,
  members: ReadonlyArray<string>
): Option.Option<ImportBinding> =>
  pipe(
    checker.getSymbolAtLocation(identifier),
    Option.fromNullable,
    Option.map((symbol) => symbol.declarations ?? Array.empty()),
    Option.flatMap(
      Array.findFirst((declaration) => Option.isSome(bindingFromDeclaration(declaration)))
    ),
    Option.flatMap((declaration) =>
      pipe(
        bindingFromDeclaration(declaration),
        Option.map((binding) => {
          const completeBinding = new ImportBinding({
            moduleSpecifier: binding.moduleSpecifier,
            path: Array.appendAll(binding.path, members)
          })

          return resolvedBarrelBinding(checker, declaration, completeBinding, maximumBarrelDepth)
        })
      )
    )
  )

const importedMemberFromPath = (
  checker: ts.TypeChecker,
  path: ExpressionPath
): Option.Option<ImportedMember> => {
  const [root, members] = path

  return pipe(
    importBindingAt(checker, root, members),
    Option.map(
      (binding) =>
        new ImportedMember({
          moduleSpecifier: binding.moduleSpecifier,
          path: binding.path
        })
    )
  )
}

export const importedMemberAt = (
  checker: ts.TypeChecker,
  expression: ts.Expression
): Option.Option<ImportedMember> =>
  pipe(
    expressionPath(expression),
    Option.flatMap((path) => importedMemberFromPath(checker, path))
  )

export const importedTypeMemberAt = (
  checker: ts.TypeChecker,
  name: ts.EntityName
): Option.Option<ImportedMember> => importedMemberFromPath(checker, entityNamePath(name))

const typeReferencesWithin = (node: ts.Node): ReadonlyArray<ts.TypeReferenceNode> =>
  foldAst(
    (
      references: ReadonlyArray<ts.TypeReferenceNode>,
      current: ts.Node
    ): ReadonlyArray<ts.TypeReferenceNode> =>
      ts.isTypeReferenceNode(current) ? Array.append(references, current) : references
  )(node)(Array.empty())

export const localTypeReferenceTargets = (
  checker: ts.TypeChecker,
  node: ts.TypeReferenceNode
): ReadonlyArray<ts.TypeReferenceNode> =>
  pipe(
    checker.getSymbolAtLocation(node.typeName),
    Option.fromNullable,
    Option.map((symbol) =>
      (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol
    ),
    Option.map((symbol) => symbol.declarations ?? Array.empty()),
    Option.map(
      Array.flatMap((declaration): ReadonlyArray<ts.TypeReferenceNode> => {
        if (!isProjectFile(declaration.getSourceFile())) {
          return Array.empty()
        }

        if (ts.isTypeAliasDeclaration(declaration)) {
          return typeReferencesWithin(declaration.type)
        }

        return ts.isInterfaceDeclaration(declaration)
          ? typeReferencesWithin(declaration)
          : Array.empty()
      })
    ),
    Option.getOrElse(Array.empty<ts.TypeReferenceNode>)
  )

export const typeReferenceIsGlobalPromise = (
  context: CheckContext,
  node: ts.TypeReferenceNode
): boolean => {
  if (!ts.isIdentifier(node.typeName) || node.typeName.text !== "Promise") {
    return false
  }

  return pipe(
    context.checker.getSymbolAtLocation(node.typeName),
    Option.fromNullable,
    Option.map((symbol) => symbol.declarations ?? Array.empty()),
    Option.exists((declarations) =>
      Array.some(declarations, (declaration) =>
        context.program.isSourceFileDefaultLibrary(declaration.getSourceFile())
      )
    )
  )
}

export const effectApiMember = (
  member: ImportedMember,
  namespace: string,
  names: ReadonlyArray<string>
): boolean => {
  const last = pipe(Array.last(member.path), Option.getOrElse(Function.constant("")))

  const fromBarrel = member.moduleSpecifier === "effect" && member.path[0] === namespace

  const fromSubpath = member.moduleSpecifier === `effect/${namespace}`

  return (fromBarrel || fromSubpath) && Array.contains(names, last)
}

export const importedEffectApiAt = (
  checker: ts.TypeChecker,
  expression: ts.Expression,
  namespace: string,
  names: ReadonlyArray<string>
): boolean =>
  pipe(
    importedMemberAt(checker, expression),
    Option.exists((member) => effectApiMember(member, namespace, names))
  )

const isEffectManagedRuntimeSource = (sourceFile: ts.SourceFile): boolean => {
  const normalized = sourceFile.fileName.replaceAll("\\", "/")

  const installed =
    normalized.includes("/node_modules/effect/") && normalized.endsWith("/ManagedRuntime.d.ts")

  const vendored = normalized.endsWith("/packages/effect/src/ManagedRuntime.ts")

  return installed || vendored
}

export const isManagedRuntimeMethodAccess = (
  checker: ts.TypeChecker,
  node: ts.PropertyAccessExpression,
  names: ReadonlyArray<string>
): boolean => {
  if (!Array.contains(names, node.name.text)) {
    return false
  }

  return pipe(
    checker.getSymbolAtLocation(node.name),
    Option.fromNullable,
    Option.map((symbol) => symbol.declarations ?? Array.empty()),
    Option.exists((declarations) =>
      Array.some(declarations, (declaration) =>
        isEffectManagedRuntimeSource(declaration.getSourceFile())
      )
    )
  )
}

export const importedEffectApiSubject = (
  checker: ts.TypeChecker,
  expression: ts.Expression
): Option.Option<string> =>
  pipe(
    importedMemberAt(checker, expression),
    Option.map((member) => {
      const memberPath = Array.join(member.path, ".")
      return `${member.moduleSpecifier}:${memberPath}`
    })
  )

export const classExtendsEffectApi = (
  checker: ts.TypeChecker,
  declaration: ts.ClassDeclaration,
  namespace: string,
  memberName: string
): boolean => {
  const clauses = declaration.heritageClauses ?? Array.empty()

  return Array.some(clauses, (clause) =>
    Array.some(clause.types, (heritage) => {
      const callee = unwrapCallee(heritage.expression)
      return importedEffectApiAt(checker, callee, namespace, Array.of(memberName))
    })
  )
}

const effectServiceMakerObject = (
  expression: ts.Expression
): Option.Option<ts.ObjectLiteralExpression> => {
  if (!ts.isCallExpression(expression)) {
    return Option.none()
  }

  const maker = pipe(
    Option.fromNullable(expression.arguments[1]),
    Option.filter(ts.isObjectLiteralExpression)
  )

  return Option.isSome(maker) ? maker : effectServiceMakerObject(expression.expression)
}

export const effectServiceConfigObject = (
  checker: ts.TypeChecker,
  declaration: ts.ClassDeclaration
): Option.Option<ts.ObjectLiteralExpression> =>
  pipe(
    declaration.heritageClauses ?? Array.empty(),
    Array.flatMap((clause) => Array.fromIterable(clause.types)),
    Array.findFirst((heritage) => {
      const callee = unwrapCallee(heritage.expression)

      return importedEffectApiAt(checker, callee, "Effect", Array.of("Service"))
    }),
    Option.flatMap((heritage) => effectServiceMakerObject(heritage.expression))
  )

const propertyNameText = (name: ts.PropertyName): Option.Option<string> => {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return Option.some(name.text)
  }

  return ts.isComputedPropertyName(name) && ts.isStringLiteralLike(name.expression)
    ? Option.some(name.expression.text)
    : Option.none()
}

export const propertyAssignmentNamed = (
  object: ts.ObjectLiteralExpression,
  names: ReadonlyArray<string>
): Option.Option<ts.PropertyAssignment> =>
  Array.findFirst(
    object.properties,
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) &&
      pipe(
        propertyNameText(property.name),
        Option.exists((name) => Array.contains(names, name))
      )
  )

type ObjectValueProperty = ts.PropertyAssignment | ts.ShorthandPropertyAssignment

const objectValuePropertyNamed = (
  object: ts.ObjectLiteralExpression,
  name: string
): Option.Option<ObjectValueProperty> =>
  Array.findFirst(
    object.properties,
    (property): property is ObjectValueProperty =>
      (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) &&
      pipe(
        propertyNameText(property.name),
        Option.exists((propertyName) => propertyName === name)
      )
  )

export const effectServiceDependencyProperty = (
  checker: ts.TypeChecker,
  declaration: ts.ClassDeclaration
): Option.Option<ObjectValueProperty> =>
  pipe(
    effectServiceConfigObject(checker, declaration),
    Option.flatMap((config) => objectValuePropertyNamed(config, "dependencies")),
    Option.filter(
      (property) =>
        !ts.isPropertyAssignment(property) ||
        !ts.isArrayLiteralExpression(property.initializer) ||
        property.initializer.elements.length > 0
    )
  )

export const sourceFileRole = (
  index: FunctionalCoreEffectIndex,
  context: CheckContext
): Option.Option<ArchitectureRole> => roleForSourceFile(index, context.sourceFile)

export const resolvedModuleSourceFile = (
  context: CheckContext,
  declaration: ts.ImportDeclaration | ts.ExportDeclaration
): Option.Option<ts.SourceFile> => {
  const moduleSpecifier = declaration.moduleSpecifier

  if (moduleSpecifier === undefined) {
    return Option.none()
  }

  const checkerSource = pipe(
    context.checker.getSymbolAtLocation(moduleSpecifier),
    Option.fromNullable,
    Option.map((symbol) => symbol.declarations ?? Array.empty()),
    Option.flatMap(Array.findFirst(ts.isSourceFile))
  )

  if (Option.isSome(checkerSource)) {
    return checkerSource
  }

  const specifier = pipe(
    Option.liftPredicate(ts.isStringLiteralLike)(moduleSpecifier),
    Option.map(Struct.get("text"))
  )

  return pipe(
    specifier,
    Option.flatMap((text) => {
      const resolution = ts.resolveModuleName(
        text,
        context.sourceFile.fileName,
        context.program.getCompilerOptions(),
        ts.sys
      )

      return Option.fromNullable(resolution.resolvedModule)
    }),
    Option.flatMap((resolved) =>
      pipe(context.program.getSourceFile(resolved.resolvedFileName), Option.fromNullable)
    )
  )
}

export const moduleMatchesPolicyPrefix = (
  policy: FunctionalCoreEffectPolicy,
  moduleSpecifier: string
): boolean =>
  Array.some(policy.capabilityModulePrefixes, (prefix) => {
    const namespacePrefix = prefix.endsWith(":")
    const namespaceMatch = namespacePrefix && moduleSpecifier.startsWith(prefix)

    const packageMatch = moduleSpecifier === prefix || moduleSpecifier.startsWith(`${prefix}/`)

    return namespaceMatch || packageMatch
  })

export const importHasRuntimeValue = (declaration: ts.ImportDeclaration): boolean => {
  const clause = declaration.importClause

  if (clause === undefined) {
    return true
  }

  if (clause.isTypeOnly) {
    return false
  }

  if (clause.name !== undefined) {
    return true
  }

  const bindings = clause.namedBindings

  if (bindings === undefined || ts.isNamespaceImport(bindings)) {
    return true
  }

  return Array.some(bindings.elements, (specifier) => !specifier.isTypeOnly)
}

const symbolIsAmbient = (checker: ts.TypeChecker, identifier: ts.Identifier): boolean =>
  pipe(
    checker.getSymbolAtLocation(identifier),
    Option.fromNullable,
    Option.map((symbol) => symbol.declarations ?? Array.empty()),
    Option.exists((declarations) => {
      const hasDeclaration = declarations.length > 0

      const hasProjectDeclaration = Array.some(declarations, (declaration) =>
        isProjectFile(declaration.getSourceFile())
      )

      return hasDeclaration && !hasProjectDeclaration
    })
  )

const ambientPathAt = (
  checker: ts.TypeChecker,
  expression: ts.Expression
): Option.Option<ReadonlyArray<string>> =>
  pipe(
    expressionPath(expression),
    Option.filter(([root]) => symbolIsAmbient(checker, root)),
    Option.map(([root, members]) => Array.prepend(members, root.text))
  )

const ambientCallSubject = (
  checker: ts.TypeChecker,
  expression: ts.Expression
): Option.Option<string> =>
  pipe(
    ambientPathAt(checker, expression),
    Option.filter((path) => {
      const joined = Array.join(path, ".")

      const directNames = Array.make(
        "fetch",
        "setTimeout",
        "setInterval",
        "setImmediate",
        "queueMicrotask"
      )

      const exactMembers = Array.make("Date.now", "Math.random", "crypto.randomUUID")

      const directMatch = path.length === 1 && Array.contains(directNames, joined)

      const exactMatch = Array.contains(exactMembers, joined)
      const receiver = path[0]

      const storageMatch = receiver === "localStorage" || receiver === "sessionStorage"

      const consoleMatch = receiver === "console"

      return directMatch || exactMatch || storageMatch || consoleMatch
    }),
    Option.map(Array.join("."))
  )

export const capabilitySubjectAt = (
  context: CheckContext,
  policy: FunctionalCoreEffectPolicy,
  node: ts.CallExpression | ts.NewExpression
): Option.Option<string> => {
  if (ts.isNewExpression(node)) {
    const newDate = pipe(
      ambientPathAt(context.checker, node.expression),
      Option.filter((path) => Array.join(path, ".") === "Date"),
      Option.filter(() => (node.arguments?.length ?? 0) === 0),
      Option.map(Function.constant("new Date"))
    )

    if (Option.isSome(newDate)) {
      return newDate
    }
  }

  const ambient = ambientCallSubject(context.checker, node.expression)

  if (Option.isSome(ambient)) {
    return ambient
  }

  return pipe(
    importedMemberAt(context.checker, node.expression),
    Option.filter((member) => moduleMatchesPolicyPrefix(policy, member.moduleSpecifier)),
    Option.map((member) => {
      const memberPath = Array.join(member.path, ".")
      return `${member.moduleSpecifier}:${memberPath}`
    })
  )
}

export const ambientCapabilityPropertySubject = (
  context: CheckContext,
  node: ts.PropertyAccessExpression
): Option.Option<string> =>
  pipe(
    ambientPathAt(context.checker, node),
    Option.filter((path) => Array.join(path, ".") === "process.env"),
    Option.map(Array.join("."))
  )

const suspensionNames = Array.make("async", "promise", "suspend", "sync", "try", "tryPromise")

const effectLifecycleNames = Array.make(
  "acquireRelease",
  "acquireReleaseInterruptible",
  "acquireUseRelease"
)

const layerLifecycleNames = Array.make("scoped", "scopedContext", "scopedDiscard")

export const isRuntimeFunctionLike = (node: ts.Node): node is ts.FunctionLikeDeclaration => {
  const checks = Array.make(
    ts.isArrowFunction(node),
    ts.isFunctionExpression(node),
    ts.isFunctionDeclaration(node),
    ts.isMethodDeclaration(node),
    ts.isConstructorDeclaration(node),
    ts.isGetAccessorDeclaration(node),
    ts.isSetAccessorDeclaration(node)
  )

  return Array.some(checks, Boolean)
}

const functionIsSuspensionCallback = (
  checker: ts.TypeChecker,
  declaration: ts.FunctionLikeDeclaration
): boolean => {
  const parent = declaration.parent

  if (ts.isCallExpression(parent)) {
    const isArgument = Array.contains(parent.arguments, declaration as ts.Expression)

    const isSuspension = importedEffectApiAt(checker, parent.expression, "Effect", suspensionNames)

    return isArgument && isSuspension
  }

  if (!ts.isPropertyAssignment(parent) || parent.initializer !== declaration) {
    return false
  }

  const propertyName =
    ts.isIdentifier(parent.name) || ts.isStringLiteralLike(parent.name) ? parent.name.text : ""

  const isTryProperty = propertyName === "try"
  const objectLiteral = parent.parent
  const call = objectLiteral.parent

  if (
    !isTryProperty ||
    !ts.isObjectLiteralExpression(objectLiteral) ||
    !ts.isCallExpression(call)
  ) {
    return false
  }

  return importedEffectApiAt(checker, call.expression, "Effect", Array.make("try", "tryPromise"))
}

export const hasSuspensionBoundary = (checker: ts.TypeChecker, node: ts.Node): boolean => {
  const visit = (current: ts.Node): boolean => {
    if (isRuntimeFunctionLike(current) && functionIsSuspensionCallback(checker, current)) {
      return true
    }

    return pipe(Option.fromNullable(current.parent), Option.exists(visit))
  }

  return visit(node)
}

export const hasEffectCallAncestor = (
  checker: ts.TypeChecker,
  node: ts.Node,
  namespace: string,
  names: ReadonlyArray<string>
): boolean => {
  const visit = (current: ts.Node): boolean => {
    const matchingCall =
      ts.isCallExpression(current) &&
      importedEffectApiAt(checker, current.expression, namespace, names)

    return matchingCall ? true : pipe(Option.fromNullable(current.parent), Option.exists(visit))
  }

  return visit(node)
}

const externalImportedMemberAt = (
  checker: ts.TypeChecker,
  expression: ts.Expression
): Option.Option<ImportedMember> =>
  pipe(
    importedMemberAt(checker, expression),
    Option.filter(
      (member) => !member.moduleSpecifier.startsWith(".") && !member.moduleSpecifier.startsWith("/")
    )
  )

export const resourceSubjectAt = (
  context: CheckContext,
  policy: FunctionalCoreEffectPolicy,
  node: ts.CallExpression | ts.NewExpression
): Option.Option<string> =>
  pipe(
    externalImportedMemberAt(context.checker, node.expression),
    Option.filter((member) => {
      const name = pipe(Array.last(member.path), Option.getOrElse(Function.constant("")))

      const factoryMatch = Array.contains(policy.resourceFactoryNames, name)

      const suffixMatch = Array.some(policy.resourceTypeSuffixes, (suffix) => name.endsWith(suffix))

      return factoryMatch || (ts.isNewExpression(node) && suffixMatch)
    }),
    Option.map((member) => {
      const memberPath = Array.join(member.path, ".")
      return `${member.moduleSpecifier}:${memberPath}`
    })
  )

export const hasScopedLifecycleAncestor = (checker: ts.TypeChecker, node: ts.Node): boolean => {
  const scopedEffect = hasEffectCallAncestor(checker, node, "Effect", effectLifecycleNames)

  const scopedLayer = hasEffectCallAncestor(checker, node, "Layer", layerLifecycleNames)

  const scoped = scopedEffect || scopedLayer

  return scoped && hasSuspensionBoundary(checker, node)
}

export const enclosingFunctionLike = (node: ts.Node): Option.Option<ts.FunctionLikeDeclaration> =>
  pipe(
    Option.fromNullable(node.parent),
    Option.flatMap((parent) =>
      isRuntimeFunctionLike(parent) ? Option.some(parent) : enclosingFunctionLike(parent)
    )
  )

const enclosingVariableNameNode = (node: ts.Node): Option.Option<ts.Identifier> =>
  pipe(
    Option.fromNullable(node.parent),
    Option.flatMap((parent) => {
      if (ts.isVariableDeclaration(parent)) {
        return Option.liftPredicate(ts.isIdentifier)(parent.name)
      }

      if (ts.isSourceFile(parent) || isRuntimeFunctionLike(parent)) {
        return Option.none()
      }

      return enclosingVariableNameNode(parent)
    })
  )

const declarationNameNode = (
  declaration: ts.FunctionLikeDeclaration
): Option.Option<ts.Identifier> => {
  if (
    ts.isFunctionDeclaration(declaration) ||
    ts.isFunctionExpression(declaration) ||
    ts.isMethodDeclaration(declaration)
  ) {
    const directName = pipe(Option.fromNullable(declaration.name), Option.filter(ts.isIdentifier))

    if (Option.isSome(directName) || ts.isMethodDeclaration(declaration)) {
      return directName
    }
  }

  return enclosingVariableNameNode(declaration)
}

export const sourceFileScopesFunction = (context: CheckContext, node: ts.Node): boolean => {
  const functionSymbol = pipe(
    enclosingFunctionLike(node),
    Option.flatMap(declarationNameNode),
    Option.flatMap((name) => pipe(context.checker.getSymbolAtLocation(name), Option.fromNullable))
  )

  if (Option.isNone(functionSymbol)) {
    return false
  }

  return foldAst((found: boolean, current: ts.Node): boolean => {
    if (found || !ts.isCallExpression(current)) {
      return found
    }

    const scopedLayer = importedEffectApiAt(
      context.checker,
      current.expression,
      "Layer",
      layerLifecycleNames
    )

    const scopedEffect = importedEffectApiAt(
      context.checker,
      current.expression,
      "Effect",
      effectLifecycleNames
    )

    if (!scopedLayer && !scopedEffect) {
      return false
    }

    return foldAst((referenced: boolean, child: ts.Node): boolean => {
      if (referenced || !ts.isIdentifier(child)) {
        return referenced
      }

      const symbol = context.checker.getSymbolAtLocation(child)
      return symbol === functionSymbol.value
    })(current)(false)
  })(context.sourceFile)(false)
}

export const isTopLevelExportedDeclaration = (node: ts.Node): boolean => {
  const visit = (current: ts.Node): boolean => {
    if (ts.isStatement(current) && current.parent.kind === ts.SyntaxKind.SourceFile) {
      return hasExportModifier(current)
    }

    return pipe(
      Option.fromNullable(current.parent),
      Option.filter(Predicate.not(ts.isSourceFile)),
      Option.exists(visit)
    )
  }

  return visit(node)
}
