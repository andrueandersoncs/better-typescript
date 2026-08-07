import { Array, Function, HashSet, Match, Option, Predicate, Schema, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { binaryAssignmentTarget } from "../support/hasAssignmentOperator.js"
import { canonicalSymbol } from "../support/canonicalSymbol.js"
import { unwrapExpression } from "../support/unwrapExpression.js"
import { isUnseenType } from "../support/isUnseenType.js"
import type { SeenTypes } from "../support/seenTypes.js"
import { strictEqual } from "../equivalence.js"
import type { MutationNode } from "./mutationNode.js"
import { MutationScope } from "./mutationScope.js"
import { isEcmaScriptLibFile } from "./isEcmaScriptLibFile.js"
import { isUncontrolledSymbol } from "./isUncontrolledSymbol.js"

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
  // Treat module and captured bindings as shared because they outlive the writer.
  const scopeOf = (target: ts.Expression) => {
    const root = rootReceiver(target)

    if (strictEqual(ts.SyntaxKind.ThisKeyword)(root.kind)) {
      return "shared-state"
    }

    const rootSymbol = context.checker.getSymbolAtLocation(root)

    return pipe(
      Option.fromNullishOr(rootSymbol),
      Option.map(canonicalSymbol(context.checker)),
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
      const receiverType = context.checker.getTypeAtLocation(unwrapped.expression)

      return isUncontrolledTypeWithSeen(emptyTypeSeen)(receiverType)
    }

    // Judge the binding declaration because an assignment rebinding x replaces the binding
    const bindingSymbol = context.checker.getSymbolAtLocation(unwrapped)

    return pipe(
      Option.fromNullishOr(bindingSymbol),
      Option.map(canonicalSymbol(context.checker)),
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
