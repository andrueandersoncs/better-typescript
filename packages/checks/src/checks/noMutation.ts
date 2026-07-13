import {
  Array,
  Function,
  HashSet,
  Match,
  Option,
  Predicate,
  Struct,
  pipe
} from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import {
  declarationSourceFile,
  isProjectFile,
  unwrapExpression
} from "./support/tsNode.js"
import { isUnseenType } from "./support/tsType.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
const message = "Avoid mutating first-party data."

const hint =
  "Match the fix to the scale of the state. Local data: derive a new value — " +
  "Array.replace or Array.modify for elements, Struct.evolve for record fields, a " +
  "fresh const for rebindings. Shared, long-lived state (module-scope bindings, " +
  "closure-captured cells, subscriber registries): do not patch the assignment — move " +
  "the state into the Effect runtime, holding it in a Ref (SynchronizedRef under " +
  "contention, PubSub for subscriber sets); when a whole file manages state this way, " +
  "invert the module into Effect behind a Layer with one runtime entry at the " +
  "boundary. Never mutate built-ins (prototypes, globals). Mutating a third-party " +
  "structure whose API contract requires assignment (process.exitCode, a WebSocket " +
  "handler slot, a React ref cell) is permitted."

type MutationNode =
  | ts.BinaryExpression
  | ts.PrefixUnaryExpression
  | ts.PostfixUnaryExpression
  | ts.DeleteExpression

const hasAssignmentOperator = (expression: ts.BinaryExpression): boolean =>
  expression.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
  expression.operatorToken.kind <= ts.SyntaxKind.LastAssignment

const incrementDecrementKinds = HashSet.make(
  ts.SyntaxKind.PlusPlusToken,
  ts.SyntaxKind.MinusMinusToken
)

const mutatesOperand = (
  unary: ts.PrefixUnaryExpression | ts.PostfixUnaryExpression
): boolean => HashSet.has(incrementDecrementKinds, unary.operator)

const binaryAssignmentTarget = (
  expression: ts.BinaryExpression
): Option.Option<ts.Expression> =>
  pipe(
    Option.liftPredicate(hasAssignmentOperator)(expression),
    Option.map(Struct.get("left"))
  )

const unaryMutationTarget = (
  unary: ts.PrefixUnaryExpression | ts.PostfixUnaryExpression
): Option.Option<ts.Expression> =>
  pipe(
    Option.liftPredicate(mutatesOperand)(unary),
    Option.map(Struct.get("operand"))
  )

const deleteExpressionTarget = (
  expression: ts.DeleteExpression
): Option.Option<ts.Expression> => Option.some(expression.expression)

// Recognize only ECMAScript default-library values as built-ins because host environments and packages remain external.
const ecmaScriptLibPrefixes: ReadonlyArray<string> = Array.make(
  "lib.es",
  "lib.decorators",
  "lib.d.ts"
)

const isEcmaScriptLibFile = (sourceFile: ts.SourceFile): boolean => {
  const normalized = sourceFile.fileName.replaceAll("\\", "/")
  const separatorIndex = normalized.lastIndexOf("/")
  const baseName = normalized.slice(separatorIndex + 1)

  return Array.some(ecmaScriptLibPrefixes, (prefix) =>
    baseName.startsWith(prefix)
  )
}

// Mark a symbol uncontrolled only because every declaration is outside the project and ECMAScript standard library.
const isUncontrolledSymbol = (symbol: ts.Symbol): boolean => {
  const declarations = symbol.getDeclarations() ?? Array.empty()
  const sourceFiles = Array.map(declarations, declarationSourceFile)
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

// Follow an import alias because its local declaration cannot determine whether the imported value is external.
const resolveAlias =
  (checker: ts.TypeChecker) =>
  (symbol: ts.Symbol): ts.Symbol => {
    const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

    return isAlias ? checker.getAliasedSymbol(symbol) : symbol
  }

// Avoid checker.getNonNullableType because it stack-overflows on Effect type parameters like Struct.evolve's O.
const nullishTypeFlags =
  ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void

const isNullishType = (type: ts.Type): boolean =>
  (type.flags & nullishTypeFlags) !== 0

const emptyTypeSeen: HashSet.HashSet<ts.Type> = HashSet.empty()

const isUncontrolledTypeWithSeen =
  (seen: HashSet.HashSet<ts.Type>) =>
  (type: ts.Type): boolean =>
    pipe(
      Option.liftPredicate(isUnseenType(seen))(type),
      Option.exists((candidate) => {
  const nextSeen = HashSet.add(seen, candidate)
  const checkMember = isUncontrolledTypeWithSeen(nextSeen)

        // Exempt a union only when every non-nullish member is uncontrolled because any member can occur at runtime.
        if (candidate.isUnion()) {
  const keepMember = Predicate.not(isNullishType)
  const members = Array.filter(candidate.types, keepMember)
  const relevant = members.length > 0 ? members : candidate.types

          return Array.every(relevant, checkMember)
        }

        if (candidate.isIntersection()) {
          return Array.some(candidate.types, checkMember)
        }

        // Prefer getSymbol because aliasSymbol names only a project-local spelling, not the declaration that shaped the value.
  const ownSymbol = candidate.getSymbol()
  const symbol = ownSymbol ?? candidate.aliasSymbol
  const isNullish = isNullishType(candidate)

  const hasUncontrolledSymbol = pipe(
          Option.fromNullable(symbol),
          Option.exists(isUncontrolledSymbol)
        )

  const nullishSymbolConditions = Array.make(isNullish, hasUncontrolledSymbol)
        return Array.some(nullishSymbolConditions, Boolean)
      })
    )

type MutationScope = "shared-state" | "local" | "builtin"

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
  HashSet.has(executionBoundaryKinds, node.kind)
    ? node
    : enclosingExecutionBoundary(node.parent)

// Use the root receiver because x.y[0].z writes into whatever x names.
const rootReceiver = (expression: ts.Expression): ts.Expression => {
  const unwrapped = unwrapExpression(expression)

  const isAccess =
    ts.isPropertyAccessExpression(unwrapped) ||
    ts.isElementAccessExpression(unwrapped)

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
  const checks = Array.make(
    ts.isBinaryExpression(node),
    ts.isPrefixUnaryExpression(node),
    ts.isPostfixUnaryExpression(node),
    ts.isDeleteExpression(node)
  )

  return Array.some(checks, Boolean)
}

const mutationMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = detection(context)

  // Treat module and captured bindings as shared because they outlive the function that writes them.
  const scopeOf = (target: ts.Expression): MutationScope => {
    const root = rootReceiver(target)

    if (root.kind === ts.SyntaxKind.ThisKeyword) {
      return "shared-state"
    }

    const rootSymbol = checker.getSymbolAtLocation(root)

    return pipe(
      Option.fromNullable(rootSymbol),
      Option.map(resolveAlias(checker)),
      Option.map((symbol): MutationScope => {
  const declarations = symbol.getDeclarations() ?? Array.empty()
  const sourceFiles = Array.map(declarations, declarationSourceFile)
  const isBuiltin = Array.some(sourceFiles, isEcmaScriptLibFile)

  const declaredScope = pipe(
          Option.fromNullable(declarations[0]),
          Option.map((declaration): MutationScope => {
  const declarationBoundary = enclosingExecutionBoundary(
              declaration.parent
            )

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

  const matches = (node: MutationNode): ReadonlyArray<Detection> =>
    pipe(
      Match.value(node),
      Match.when(ts.isBinaryExpression, binaryAssignmentTarget),
      Match.when(ts.isDeleteExpression, deleteExpressionTarget),
      Match.orElse(unaryMutationTarget),
      Option.filter(
        Predicate.not((target) => {
  const unwrapped = unwrapExpression(target)

  const isAccess =
            ts.isPropertyAccessExpression(unwrapped) ||
            ts.isElementAccessExpression(unwrapped)

          // Judge the receiver because property and element assignments write into its data structure.
          if (isAccess) {
  const receiverType = checker.getTypeAtLocation(unwrapped.expression)

            return isUncontrolledTypeWithSeen(emptyTypeSeen)(receiverType)
          }

          // Judge the binding declaration because an assignment rebinding x replaces the binding itself.
  const bindingSymbol = checker.getSymbolAtLocation(unwrapped)

          return pipe(
            Option.fromNullable(bindingSymbol),
            Option.map(resolveAlias(checker)),
            Option.exists(isUncontrolledSymbol)
          )
        })
      ),
      Option.map((target) => {
  const targetScope = scopeOf(target)

        return match({
          node: target,
          message,
          hint,
          data: { target: targetScope }
        })
      }),
      Option.toArray
    )

  return matches
}

const check = nodeCheck(mutationNodeKinds)(isMutationCandidate)(mutationMatches)

export const noMutation: Check = check

export const noMutationExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-mutation")
