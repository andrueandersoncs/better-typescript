import { HashSet, Match, Option, Predicate, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import {
  declarationSourceFile,
  isProjectFile,
  unwrapExpression
} from "./tsNode.js"
import { detection } from "../detectors/location.js"
import type { MakeDetection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

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

// Built-in JavaScript values (Array, Object, Error.prototype, ...) are declared in the ECMAScript default libraries; host environments (lib.dom) and packages are not.
const ecmaScriptLibPrefixes: ReadonlyArray<string> = [
  "lib.es",
  "lib.decorators",
  "lib.d.ts"
]

const isPrefixOf =
  (baseName: string) =>
  (prefix: string): boolean =>
    baseName.startsWith(prefix)

const isEcmaScriptLibFile = (sourceFile: ts.SourceFile): boolean => {
  const normalized = sourceFile.fileName.replaceAll("\\", "/")
  const separatorIndex = normalized.lastIndexOf("/")
  const baseName = normalized.slice(separatorIndex + 1)

  return ecmaScriptLibPrefixes.some(isPrefixOf(baseName))
}

// A symbol is uncontrolled when every declaration lives outside the project AND outside the ECMAScript standard library: host globals (WebSocket), package types (ts.System). Project declarations and JS built-ins are first-party data the author keeps immutable.
const isUncontrolledSymbol = (symbol: ts.Symbol): boolean => {
  const declarations = symbol.getDeclarations() ?? []
  const sourceFiles = declarations.map(declarationSourceFile)
  const hasDeclarations = sourceFiles.length > 0
  const isDeclaredInProject = sourceFiles.some(isProjectFile)
  const isEcmaScriptBuiltin = sourceFiles.some(isEcmaScriptLibFile)

  return [hasDeclarations, !isDeclaredInProject, !isEcmaScriptBuiltin].every(
    Boolean
  )
}

// An import binding is an alias symbol declared in THIS file; the exemption must judge the aliased declaration, not the local import statement.
const resolveAlias =
  (checker: ts.TypeChecker) =>
  (symbol: ts.Symbol): ts.Symbol => {
    const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

    return isAlias ? checker.getAliasedSymbol(symbol) : symbol
  }

const isUncontrolledType =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): boolean => {
    const withoutNullability = checker.getNonNullableType(type)

    // A union receiver could hold any member at runtime: exempt only when every member is uncontrolled. An intersection is one value; a single uncontrolled constituent (Window & typeof globalThis) marks the whole value third-party.
    if (withoutNullability.isUnion()) {
      return withoutNullability.types.every(isUncontrolledType(checker))
    }

    if (withoutNullability.isIntersection()) {
      return withoutNullability.types.some(isUncontrolledType(checker))
    }

    // getSymbol() names the declaration that shaped the value (class WebSocket); aliasSymbol only names a project-local spelling and must not override it.
    const symbol =
      withoutNullability.getSymbol() ?? withoutNullability.aliasSymbol

    return pipe(
      Option.fromNullable(symbol),
      Option.exists(isUncontrolledSymbol)
    )
  }

const isUncontrolledTarget =
  (checker: ts.TypeChecker) =>
  (target: ts.Expression): boolean => {
    const unwrapped = unwrapExpression(target)
    const isAccess =
      ts.isPropertyAccessExpression(unwrapped) ||
      ts.isElementAccessExpression(unwrapped)

    // x.y = v and x[0] = v write INTO x: the exemption belongs to the data structure being written, so judge the type of the receiver expression.
    if (isAccess) {
      const receiverType = checker.getTypeAtLocation(unwrapped.expression)

      return isUncontrolledType(checker)(receiverType)
    }

    // x = v rebinds x itself: the exemption belongs to the binding's declaration site.
    const bindingSymbol = checker.getSymbolAtLocation(unwrapped)

    return pipe(
      Option.fromNullable(bindingSymbol),
      Option.map(resolveAlias(checker)),
      Option.exists(isUncontrolledSymbol)
    )
  }

// --- scope facets: shared-state | local | builtin ---

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

// x.y[0].z writes into whatever x names, so the scope facet belongs to the root receiver.
const rootReceiver = (expression: ts.Expression): ts.Expression => {
  const unwrapped = unwrapExpression(expression)
  const isAccess =
    ts.isPropertyAccessExpression(unwrapped) ||
    ts.isElementAccessExpression(unwrapped)

  return isAccess ? rootReceiver(unwrapped.expression) : unwrapped
}

// Shared state outlives the function that writes it: a binding declared at module scope, or captured from an enclosing function, is a long-lived cell rather than local data.
const scopeForDeclaration =
  (root: ts.Node) =>
  (declaration: ts.Declaration): MutationScope => {
    const declarationBoundary = enclosingExecutionBoundary(declaration.parent)
    const mutationBoundary = enclosingExecutionBoundary(root.parent)
    const isModuleScoped = ts.isSourceFile(declarationBoundary)
    const isCaptured = declarationBoundary !== mutationBoundary

    return [isModuleScoped, isCaptured].some(Boolean) ? "shared-state" : "local"
  }

const fallbackLocalScope = (): MutationScope => "local"

const scopeForResolvedSymbol =
  (root: ts.Node) =>
  (symbol: ts.Symbol): MutationScope => {
    const declarations = symbol.getDeclarations() ?? []
    const sourceFiles = declarations.map(declarationSourceFile)
    const isBuiltin = sourceFiles.some(isEcmaScriptLibFile)
    const declaredScope = pipe(
      Option.fromNullable(declarations[0]),
      Option.map(scopeForDeclaration(root)),
      Option.getOrElse(fallbackLocalScope)
    )

    return isBuiltin ? "builtin" : declaredScope
  }

const mutationScope =
  (checker: ts.TypeChecker) =>
  (target: ts.Expression): MutationScope => {
    const root = rootReceiver(target)

    if (root.kind === ts.SyntaxKind.ThisKeyword) {
      return "shared-state"
    }

    const rootSymbol = checker.getSymbolAtLocation(root)

    return pipe(
      Option.fromNullable(rootSymbol),
      Option.map(resolveAlias(checker)),
      Option.map(scopeForResolvedSymbol(root)),
      Option.getOrElse(fallbackLocalScope)
    )
  }

const mutationDetection =
  (match: MakeDetection) =>
  (scopeOf: (target: ts.Expression) => MutationScope) =>
  (target: ts.Expression): Detection => {
    const scope = scopeOf(target)

    return match({ node: target, message, hint, data: { target: scope } })
  }

const mutationNodeKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.PrefixUnaryExpression,
  ts.SyntaxKind.PostfixUnaryExpression,
  ts.SyntaxKind.DeleteExpression
]

const isMutationCandidate = (node: ts.Node): node is MutationNode =>
  [
    ts.isBinaryExpression(node),
    ts.isPrefixUnaryExpression(node),
    ts.isPostfixUnaryExpression(node),
    ts.isDeleteExpression(node)
  ].some(Boolean)

// The context stage runs once per file, so the exemption check and match partial are shared by every candidate the report wiring feeds to matches.
const mutationMatches = (context: RuleContext) => {
  const isExemptTarget = isUncontrolledTarget(context.checker)
  const scopeOf = mutationScope(context.checker)
  const ruleMatch = mutationDetection(detection(context))(scopeOf)

  const matches = (node: MutationNode): ReadonlyArray<Detection> =>
    pipe(
      Match.value(node),
      Match.when(ts.isBinaryExpression, binaryAssignmentTarget),
      Match.when(ts.isDeleteExpression, deleteExpressionTarget),
      Match.orElse(unaryMutationTarget),
      Option.filter(Predicate.not(isExemptTarget)),
      Option.map(ruleMatch),
      Option.toArray
    )

  return matches
}

const check = nodeCheck(mutationNodeKinds)(isMutationCandidate)(mutationMatches)

export const noMutation: RuleCheck = check
