import { HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { unwrapTransparentExpression } from "./support/tsNode.js"
import { detection } from "../engine/location.js"
import type { MakeDetection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"

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

const optionMatchDetection =
  (match: MakeDetection) =>
  (conditional: ts.ConditionalExpression) =>
  (_guard: readonly [OptionGuardKind, string]): Detection =>
    match({
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

const optionMatchMatches = (context: CheckContext) => {
  const ruleMatch = optionMatchDetection(detection(context))

  const matches = (
    conditional: ts.ConditionalExpression
  ): ReadonlyArray<Detection> =>
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

const check = nodeCheck([ts.SyntaxKind.ConditionalExpression])(
  ts.isConditionalExpression
)(optionMatchMatches)

export const preferOptionMatch: Check = check
