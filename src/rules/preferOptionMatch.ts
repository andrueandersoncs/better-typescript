import { HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapTransparentExpression } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-option-match"

type OptionGuardKind = "isSome" | "isNone"

const guardMethodNames = HashSet.make("isSome", "isNone")

const isOptionText = (text: string): boolean => text === "Option"

const isGuardMethodName = (name: string): boolean =>
  HashSet.has(guardMethodNames, name)

// Extracts [kind, argumentName] from `Option.isSome(x)` or `Option.isNone(x)`.
const optionGuardCall = (
  expression: ts.Expression
): Option.Option<readonly [OptionGuardKind, string]> =>
  Option.gen(function* () {
    const unwrapped = unwrapTransparentExpression(expression)
    const call = yield* Option.liftPredicate(ts.isCallExpression)(unwrapped)
    const callee = yield* Option.liftPredicate(ts.isPropertyAccessExpression)(
      call.expression
    )
    const object = yield* Option.liftPredicate(ts.isIdentifier)(
      callee.expression
    )
    yield* Option.liftPredicate(isOptionText)(object.text)
    const methodName = callee.name.text
    yield* Option.liftPredicate(isGuardMethodName)(methodName)
    const firstArg = yield* Option.fromNullable(call.arguments[0])
    const identifier = yield* Option.liftPredicate(ts.isIdentifier)(firstArg)

    return [methodName as OptionGuardKind, identifier.text] as const
  })

const identifierHasText =
  (name: string) =>
  (identifier: ts.Identifier): boolean =>
    identifier.text === name

const objectHasName =
  (name: string) =>
  (access: ts.PropertyAccessExpression): boolean =>
    ts.isIdentifier(access.expression) &&
    identifierHasText(name)(access.expression)

const isValueMember = (access: ts.PropertyAccessExpression): boolean =>
  access.name.text === "value"

const accessesNamedValue =
  (name: string) =>
  (access: ts.PropertyAccessExpression): boolean =>
    isValueMember(access) && objectHasName(name)(access)

const isDotValueAccess =
  (name: string) =>
  (node: ts.Node): boolean =>
    ts.isPropertyAccessExpression(node) && accessesNamedValue(name)(node)

const containsDotValueInChild =
  (name: string) =>
  (child: ts.Node): boolean =>
    containsDotValue(name, child)

const childHasDotValue = (name: string, node: ts.Node): boolean =>
  ts.forEachChild(node, containsDotValueInChild(name)) === true

const containsDotValue = (name: string, node: ts.Node): boolean =>
  isDotValueAccess(name)(node) || childHasDotValue(name, node)

const branchToCheck =
  (kind: OptionGuardKind) =>
  (conditional: ts.ConditionalExpression): ts.Expression => {
    const isSomeGuard = kind === "isSome"

    return isSomeGuard ? conditional.whenTrue : conditional.whenFalse
  }

const optionMatchRuleMatch =
  (context: RuleContext, conditional: ts.ConditionalExpression) =>
  (_guard: readonly [OptionGuardKind, string]): RuleMatch =>
    createRuleMatch(context, {
      ruleId,
      node: conditional,
      message:
        "Avoid using Option.isSome/isNone in a ternary to unwrap an Option.",
      hint:
        "Use Option.match(option, { onNone: () => fallback, onSome: (value) => ... }) " +
        "instead of manually checking and accessing .value."
    })

const hasDotValueInBranch =
  (conditional: ts.ConditionalExpression) =>
  ([kind, argumentName]: readonly [OptionGuardKind, string]): boolean => {
    const branch = branchToCheck(kind)(conditional)

    return containsDotValue(argumentName, branch)
  }

const optionMatchMatches = (
  conditional: ts.ConditionalExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  pipe(
    optionGuardCall(conditional.condition),
    Option.filter(hasDotValueInBranch(conditional)),
    Option.map(optionMatchRuleMatch(context, conditional)),
    Option.toArray
  )

const check = onNode(
  [ts.SyntaxKind.ConditionalExpression],
  ts.isConditionalExpression,
  optionMatchMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/resolve.ts",
  code: `const resolved = Option.isSome(typeNode)
  ? checker.getTypeFromTypeNode(typeNode.value)
  : checker.getTypeAtLocation(parameter)`
})

const goodExample = new ExampleSnippet({
  filePath: "src/resolve.ts",
  code: `const resolved = Option.match(typeNode, {
  onNone: () => checker.getTypeAtLocation(parameter),
  onSome: (node) => checker.getTypeFromTypeNode(node)
})`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferOptionMatch = new Rule({
  id: ruleId,
  description:
    "Disallow Option.isSome/isNone ternaries in favor of Option.match.",
  example,
  check
})
