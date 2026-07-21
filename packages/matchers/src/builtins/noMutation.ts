import { Array, Function, HashSet, Match, Option, pipe, Predicate, Struct, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"
import { binaryAssignmentTarget, isProjectFile, unwrapExpression } from "../support/tsNode.js"
import { isUnseenType, type SeenTypes } from "../support/tsType.js"
import { strictEqual } from "../equivalence.js"

// MutationNode is a local syntax union because matchers need one narrowed node shape.
export type MutationNode =
  ts.BinaryExpression | ts.PrefixUnaryExpression | ts.PostfixUnaryExpression | ts.DeleteExpression

const mutationScopes = Array.make<["shared-state", "local", "builtin"]>(
  "shared-state",
  "local",
  "builtin"
)

// MutationScope classifies mutation sites because local and external advice differ.
export const MutationScope = Schema.Literals(mutationScopes)

export type MutationScope = typeof MutationScope.Type

// NoMutationFact classifies the write target because shared-state, local, and builtin advice.
export const NoMutationFact = Schema.Struct({
  target: MutationScope
})

export interface NoMutationFact extends Schema.Schema.Type<typeof NoMutationFact> {}

const incrementDecrementKinds = HashSet.make(
  ts.SyntaxKind.PlusPlusToken,
  ts.SyntaxKind.MinusMinusToken
)

const mutatesOperand = (unary: ts.PrefixUnaryExpression | ts.PostfixUnaryExpression) =>
  HashSet.has(incrementDecrementKinds, unary.operator)

const unaryMutationTarget = (
  unary: ts.PrefixUnaryExpression | ts.PostfixUnaryExpression
): Option.Option<ts.Expression> =>
  pipe(Option.liftPredicate(mutatesOperand)(unary), Option.map(Struct.get("operand")))

const deleteExpressionTarget = (expression: ts.DeleteExpression): Option.Option<ts.Expression> =>
  Option.some(expression.expression)

// Recognize only ECMAScript lib values as built-ins because hosts and packages stay external.
const ecmaScriptLibPrefixes: ReadonlyArray<string> = Array.make(
  "lib.es",
  "lib.decorators",
  "lib.d.ts"
)

const isEcmaScriptLibFile = (sourceFile: ts.SourceFile) => {
  const normalized = sourceFile.fileName.replaceAll("\\", "/")
  const separatorIndex = normalized.lastIndexOf("/")
  const baseName = normalized.slice(separatorIndex + 1)

  return Array.some(ecmaScriptLibPrefixes, (prefix) => baseName.startsWith(prefix))
}

// Mark a symbol uncontrolled only because every declaration is outside the project and ES library.
const isUncontrolledSymbol = (symbol: ts.Symbol) => {
  const declarations = symbol.getDeclarations() ?? Array.empty()
  const sourceFiles = Array.map(declarations, (declaration) => declaration.getSourceFile())
  const hasDeclarations = sourceFiles.length > 0
  const isDeclaredInProject = Array.some(sourceFiles, isProjectFile)
  const isEcmaScriptBuiltin = Array.some(sourceFiles, isEcmaScriptLibFile)

  const moduleScopedConditions = Array.make(
    hasDeclarations,
    !isDeclaredInProject,
    !isEcmaScriptBuiltin
  )

  return Array.every(moduleScopedConditions, Boolean)
}

// Follow an import alias because its local declaration cannot show whether the import is external.
const resolveAlias = (checker: ts.TypeChecker) => (symbol: ts.Symbol) => {
  const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

  return isAlias ? checker.getAliasedSymbol(symbol) : symbol
}

// Avoid getNonNullableType because it stack-overflows on Effect params like Struct.evolve's O.
const nullishTypeFlags = ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void

const isNullishType = (type: ts.Type) => (type.flags & nullishTypeFlags) !== 0

const emptyTypeSeen: SeenTypes = Array.empty()

const isUncontrolledTypeWithSeen =
  (seen: SeenTypes) =>
  (type: ts.Type): boolean =>
    pipe(
      Option.liftPredicate(isUnseenType(seen))(type),
      Option.exists((candidate) => {
        const nextSeen = Array.append(seen, candidate)
        const checkMember = isUncontrolledTypeWithSeen(nextSeen)

        // Exempt union only when every non-nullish because any can occur at runtime.
        if (candidate.isUnion()) {
          const keepMember = Predicate.not(isNullishType)
          const members = Array.filter(candidate.types, keepMember)
          const relevant = members.length > 0 ? members : candidate.types

          return Array.every(relevant, checkMember)
        }

        if (candidate.isIntersection()) {
          return Array.some(candidate.types, checkMember)
        }

        // Prefer getSymbol because aliasSymbol names a local spelling, not the shaping declaration.
        const ownSymbol = candidate.getSymbol()
        const symbol = ownSymbol ?? candidate.aliasSymbol
        const isNullish = isNullishType(candidate)

        const hasUncontrolledSymbol = pipe(
          Option.fromNullishOr(symbol),
          Option.exists(isUncontrolledSymbol)
        )

        const nullishSymbolConditions = Array.make(isNullish, hasUncontrolledSymbol)

        return Array.some(nullishSymbolConditions, Boolean)
      })
    )

const executionBoundaryKinds = HashSet.make(
  ts.SyntaxKind.SourceFile,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor
)

const enclosingExecutionBoundary = (node: ts.Node): ts.Node =>
  HashSet.has(executionBoundaryKinds, node.kind) ? node : enclosingExecutionBoundary(node.parent)

// Use the root receiver because x.y[0].z writes into whatever x names.
const rootReceiver = (expression: ts.Expression): ts.Expression => {
  const unwrapped = unwrapExpression(expression)

  const isAccess =
    ts.isPropertyAccessExpression(unwrapped) || ts.isElementAccessExpression(unwrapped)

  return isAccess ? rootReceiver(unwrapped.expression) : unwrapped
}

const fallbackLocalScope: () => MutationScope = Function.constant("local")

const mutationNodeKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.PrefixUnaryExpression,
  ts.SyntaxKind.PostfixUnaryExpression,
  ts.SyntaxKind.DeleteExpression
)

const isMutationCandidate = (node: ts.Node): node is MutationNode => {
  const isBinary = ts.isBinaryExpression(node)
  const isPrefixUnary = ts.isPrefixUnaryExpression(node)
  const isPostfixUnary = ts.isPostfixUnaryExpression(node)
  const isDelete = ts.isDeleteExpression(node)
  const checks = Array.make(isBinary, isPrefixUnary, isPostfixUnary, isDelete)

  return Array.some(checks, Boolean)
}

const mutationMatches = (context: MatchContext) => {
  const checker = context.checker

  // Treat module and captured bindings as shared because they outlive the writer.
  const scopeOf = (target: ts.Expression) => {
    const root = rootReceiver(target)

    if (strictEqual(ts.SyntaxKind.ThisKeyword)(root.kind)) {
      return "shared-state"
    }

    const rootSymbol = checker.getSymbolAtLocation(root)

    return pipe(
      Option.fromNullishOr(rootSymbol),
      Option.map(resolveAlias(checker)),
      Option.map((symbol): MutationScope => {
        const declarations = symbol.getDeclarations() ?? Array.empty()
        const sourceFiles = Array.map(declarations, (declaration) => declaration.getSourceFile())
        const isBuiltin = Array.some(sourceFiles, isEcmaScriptLibFile)
        const firstDeclaration = Array.head(declarations)

        const declaredScope = pipe(
          firstDeclaration,
          Option.map((declaration): MutationScope => {
            const declarationBoundary = enclosingExecutionBoundary(declaration.parent)
            const mutationBoundary = enclosingExecutionBoundary(root.parent)
            const isModuleScoped = ts.isSourceFile(declarationBoundary)
            const isCaptured = declarationBoundary !== mutationBoundary
            const sharedStateConditions = Array.make(isModuleScoped, isCaptured)
            return Array.some(sharedStateConditions, Boolean) ? "shared-state" : "local"
          }),
          Option.getOrElse(fallbackLocalScope)
        )

        return isBuiltin ? "builtin" : declaredScope
      }),
      Option.getOrElse(fallbackLocalScope)
    )
  }

  const isUncontrolledMutationTarget = (target: ts.Expression) => {
    const unwrapped = unwrapExpression(target)

    const isAccess =
      ts.isPropertyAccessExpression(unwrapped) || ts.isElementAccessExpression(unwrapped)

    // Judge the receiver because property and element assignments write into its data
    if (isAccess) {
      const receiverType = checker.getTypeAtLocation(unwrapped.expression)

      return isUncontrolledTypeWithSeen(emptyTypeSeen)(receiverType)
    }

    // Judge the binding declaration because an assignment rebinding x replaces the binding
    const bindingSymbol = checker.getSymbolAtLocation(unwrapped)

    return pipe(
      Option.fromNullishOr(bindingSymbol),
      Option.map(resolveAlias(checker)),
      Option.exists(isUncontrolledSymbol)
    )
  }

  const factForTarget = (target: ts.Expression) => {
    const targetScope = scopeOf(target)
    const fact = NoMutationFact.make({ target: targetScope })

    return makeNodeMatch(target, fact)
  }

  const matchMutationNode = (node: MutationNode) =>
    pipe(
      Match.value(node),
      Match.when(ts.isBinaryExpression, binaryAssignmentTarget),
      Match.when(ts.isDeleteExpression, deleteExpressionTarget),
      Match.orElse(unaryMutationTarget),
      Option.filter(Predicate.not(isUncontrolledMutationTarget)),
      Option.map(factForTarget),
      Option.toArray
    )

  return matchMutationNode
}

export const noMutationMatcher =
  nodeMatcher(mutationNodeKinds)(isMutationCandidate)(mutationMatches)
