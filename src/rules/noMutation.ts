import { HashSet, Match, Option, Predicate, Struct, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { CreateMatch } from "./ruleMatch.js"
import { isFirstPartySymbol, unwrapExpression } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-mutation"

const message = "Avoid mutating state."

const hint =
  "Every binding and every data structure should be immutable. Derive a new value " +
  "instead of overwriting an existing one: Array.replace or Array.modify for array " +
  "elements, Struct.evolve for record fields, and a fresh const for rebindings. " +
  "Mutating a third-party object is permitted only where its API contract requires " +
  "assignment (for example process.exitCode)."

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

// x.y[0].z = v mutates whatever x names: the exemption decision belongs to the root receiver, not the leaf access.
const rootReceiver = (expression: ts.Expression): ts.Expression => {
  const unwrapped = unwrapExpression(expression)
  const isAccess =
    ts.isPropertyAccessExpression(unwrapped) ||
    ts.isElementAccessExpression(unwrapped)

  return isAccess ? rootReceiver(unwrapped.expression) : unwrapped
}

const isThirdPartySymbol = (symbol: ts.Symbol): boolean =>
  !isFirstPartySymbol(symbol)

// An import binding is an alias symbol declared in THIS file; the mutation exemption must judge the aliased declaration, not the local import statement.
const resolveAlias =
  (checker: ts.TypeChecker) =>
  (symbol: ts.Symbol): ts.Symbol => {
    const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

    return isAlias ? checker.getAliasedSymbol(symbol) : symbol
  }

// Assigning into a third-party object (process.exitCode = 1) follows that API's contract; there is no immutable alternative to offer.
const isThirdPartyReceiver =
  (checker: ts.TypeChecker) =>
  (target: ts.Expression): boolean => {
    const receiver = rootReceiver(target)
    const symbol = checker.getSymbolAtLocation(receiver)

    return pipe(
      Option.fromNullable(symbol),
      Option.map(resolveAlias(checker)),
      Option.exists(isThirdPartySymbol)
    )
  }

const mutationRuleMatch =
  (match: CreateMatch) =>
  (target: ts.Expression): RuleMatch =>
    match({ ruleId, node: target, message, hint })

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

// The context stage runs once per file, so the third-party check and match partial are shared by every candidate the dispatcher feeds to matches.
const mutationMatches = (context: RuleContext) => {
  const isExemptTarget = isThirdPartyReceiver(context.checker)
  const ruleMatch = mutationRuleMatch(createRuleMatch(context))

  const matches = (node: MutationNode): ReadonlyArray<RuleMatch> =>
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

const check = onNode(mutationNodeKinds)(isMutationCandidate)(mutationMatches)

const badExample = new ExampleSnippet({
  filePath: "src/counter.ts",
  code: `interface Counter {
  count: number
}

declare const counter: Counter
declare const scores: Array<number>

counter.count = counter.count + 1
scores[0] = 100`
})

const goodExample = new ExampleSnippet({
  filePath: "src/counter.ts",
  code: `import { Array } from "effect"

declare const scores: ReadonlyArray<number>

export const raised = Array.replace(scores, 0, 100)
export const doubled = Array.modify(scores, 0, (score) => score * 2)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noMutation = new Rule({
  id: ruleId,
  description:
    "Disallow mutation: assignment to any existing binding, property, or element, " +
    "increment/decrement, and delete; mutating third-party objects whose API " +
    "requires it is permitted.",
  example,
  check
})
