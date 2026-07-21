import { Array, Function, HashSet, Option, pipe, Tuple, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"
import { unwrapTransparentExpression } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

const optionGuardKinds = Array.make<["isSome", "isNone"]>("isSome", "isNone")

// OptionGuardKind classifies Option guards because isSome and isNone advice differ.
export const OptionGuardKind = Schema.Literals(optionGuardKinds)

export type OptionGuardKind = typeof OptionGuardKind.Type

// PreferOptionMatchFact pairs the Option guard and b because guidance rewrites to Option.match.
export const PreferOptionMatchFact = Schema.Struct({
  kind: OptionGuardKind,
  argumentName: Schema.String
})

export interface PreferOptionMatchFact extends Schema.Schema.Type<typeof PreferOptionMatchFact> {}

const guardMethodNames = HashSet.make("isSome", "isNone")

const isOptionText = strictEqual("Option")

const isGuardMethodName = (name: string) => HashSet.has(guardMethodNames, name)

const containsDotValue =
  (name: string) =>
  (node: ts.Node): boolean => {
    const childResult = ts.forEachChild(node, containsDotValue(name))
    const childHasDotValue = strictEqual(true)(childResult)
    const isPropertyAccess = ts.isPropertyAccessExpression(node)

    if (!isPropertyAccess) {
      return childHasDotValue
    }

    const hasValueName = strictEqual("value")(node.name.text)
    const expressionIsIdentifier = ts.isIdentifier(node.expression)

    if (!expressionIsIdentifier) {
      return childHasDotValue
    }

    const expressionTextMatches = strictEqual(name)(node.expression.text)
    const isDotValue = hasValueName && expressionTextMatches

    return isDotValue || childHasDotValue
  }

const conditionalExpressionKinds = Array.of(ts.SyntaxKind.ConditionalExpression)

const matchOptionGuardConditional = (conditional: ts.ConditionalExpression) =>
  pipe(
    Option.gen(function* () {
      const unwrapped = unwrapTransparentExpression(conditional.condition)
      const call = yield* Option.liftPredicate(ts.isCallExpression)(unwrapped)
      const callee = yield* Option.liftPredicate(ts.isPropertyAccessExpression)(call.expression)
      const object = yield* Option.liftPredicate(ts.isIdentifier)(callee.expression)

      yield* Option.liftPredicate(isOptionText)(object.text)
      const methodName = callee.name.text
      yield* Option.liftPredicate(isGuardMethodName)(methodName)
      const firstArg = yield* Option.fromNullishOr(call.arguments[0])
      const identifier = yield* Option.liftPredicate(ts.isIdentifier)(firstArg)

      return Tuple.make(methodName as OptionGuardKind, identifier.text)
    }),
    Option.filter(([kind, argumentName]: readonly [OptionGuardKind, string]): boolean => {
      const isSomeGuard = strictEqual("isSome")(kind)
      const branch = isSomeGuard ? conditional.whenTrue : conditional.whenFalse

      return containsDotValue(argumentName)(branch)
    }),
    Option.map(([kind, argumentName]: readonly [OptionGuardKind, string]) => {
      const fact = PreferOptionMatchFact.make({
        kind,
        argumentName
      })

      return nodeMatch(conditional, fact)
    }),
    Option.toArray
  )

const optionMatchMatches = Function.constant(matchOptionGuardConditional)

export const preferOptionMatchMatcher = nodeMatcher(conditionalExpressionKinds)(
  ts.isConditionalExpression
)(optionMatchMatches)
