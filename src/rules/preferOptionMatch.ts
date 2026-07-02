import { HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { CreateMatch } from "./ruleMatch.js"
import { unwrapTransparentExpression } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-option-match"

type OptionGuardKind = "isSome" | "isNone"

const guardMethodNames = HashSet.make("isSome", "isNone")

const isOptionText = (text: string): boolean => text === "Option"

const isGuardMethodName = (name: string): boolean =>
  HashSet.has(guardMethodNames, name)

const identifierHasText =
  (name: string) =>
  (identifier: ts.Identifier): boolean =>
    identifier.text === name

const objectHasName =
  (name: string) =>
  (access: ts.PropertyAccessExpression): boolean =>
    ts.isIdentifier(access.expression) &&
    identifierHasText(name)(access.expression)

const accessesNamedValue =
  (name: string) =>
  (access: ts.PropertyAccessExpression): boolean => {
    const isValueProperty = access.name.text === "value"

    return isValueProperty && objectHasName(name)(access)
  }

const isDotValueAccess =
  (name: string) =>
  (node: ts.Node): boolean =>
    ts.isPropertyAccessExpression(node) && accessesNamedValue(name)(node)

const containsDotValueInChild =
  (name: string) =>
  (child: ts.Node): boolean =>
    containsDotValue(name)(child)

const containsDotValue =
  (name: string) =>
  (node: ts.Node): boolean => {
    const isDotValue = isDotValueAccess(name)(node)
    const childHasDotValue =
      ts.forEachChild(node, containsDotValueInChild(name)) === true

    return isDotValue || childHasDotValue
  }

const branchToCheck =
  (kind: OptionGuardKind) =>
  (conditional: ts.ConditionalExpression): ts.Expression => {
    const isSomeGuard = kind === "isSome"

    return isSomeGuard ? conditional.whenTrue : conditional.whenFalse
  }

const optionMatchRuleMatch =
  (match: CreateMatch) =>
  (conditional: ts.ConditionalExpression) =>
  (_guard: readonly [OptionGuardKind, string]): RuleMatch =>
    match({
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

    return containsDotValue(argumentName)(branch)
  }

// The context stage runs once per file, so the specialized rule match is shared by every ConditionalExpression the dispatcher feeds to matches.
const optionMatchMatches = (context: RuleContext) => {
  const ruleMatch = optionMatchRuleMatch(createRuleMatch(context))

  const matches = (
    conditional: ts.ConditionalExpression
  ): ReadonlyArray<RuleMatch> =>
    pipe(
      Option.gen(function* () {
        const unwrapped = unwrapTransparentExpression(conditional.condition)
        const call = yield* Option.liftPredicate(ts.isCallExpression)(unwrapped)
        const callee = yield* Option.liftPredicate(
          ts.isPropertyAccessExpression
        )(call.expression)
        const object = yield* Option.liftPredicate(ts.isIdentifier)(
          callee.expression
        )
        yield* Option.liftPredicate(isOptionText)(object.text)
        const methodName = callee.name.text
        yield* Option.liftPredicate(isGuardMethodName)(methodName)
        const firstArg = yield* Option.fromNullable(call.arguments[0])
        const identifier = yield* Option.liftPredicate(ts.isIdentifier)(
          firstArg
        )

        return [methodName as OptionGuardKind, identifier.text] as const
      }),
      Option.filter(hasDotValueInBranch(conditional)),
      Option.map(ruleMatch(conditional)),
      Option.toArray
    )

  return matches
}

const check = onNode([ts.SyntaxKind.ConditionalExpression])(
  ts.isConditionalExpression
)(optionMatchMatches)

const badExample = new ExampleSnippet({
  filePath: "src/resolve.ts",
  code: `import { Option } from "effect"
import type * as ts from "typescript"

declare const typeNode: Option.Option<ts.TypeNode>
declare const checker: ts.TypeChecker
declare const parameter: ts.ParameterDeclaration

export const resolved = Option.isSome(typeNode)
  ? checker.getTypeFromTypeNode(typeNode.value)
  : checker.getTypeAtLocation(parameter)`
})

const goodExample = new ExampleSnippet({
  filePath: "src/resolve.ts",
  code: `import { Option } from "effect"
import type * as ts from "typescript"

declare const typeNode: Option.Option<ts.TypeNode>
declare const checker: ts.TypeChecker
declare const parameter: ts.ParameterDeclaration

export const resolved = Option.match(typeNode, {
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
