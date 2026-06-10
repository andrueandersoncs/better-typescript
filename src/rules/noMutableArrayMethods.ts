import { Chunk, Effect, Option, Stream } from "effect"
import * as ts from "typescript"
import { createRuleMatch } from "./ruleMatch.js"
import { nodeStream } from "./traverse.js"
import type { Rule, RuleContext } from "./types.js"

const ruleId = "no-mutable-array-methods"

type MutableArrayMethod =
  | "copyWithin"
  | "fill"
  | "pop"
  | "push"
  | "reverse"
  | "shift"
  | "sort"
  | "splice"
  | "unshift"

interface MutableArrayMethodCall {
  readonly callExpression: ts.CallExpression
  readonly methodName: MutableArrayMethod
}

const mutableArrayMethods = new Set<MutableArrayMethod>([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift"
])

export const noMutableArrayMethods: Rule = {
  id: ruleId,
  description: "Disallow mutable array methods in favor of immutable array operations.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isCallExpression),
        Stream.filterMap((callExpression) =>
          mutableArrayMethodCall(context, callExpression)
        ),
        Stream.map((match) =>
          createRuleMatch(context, {
            ruleId,
            node: match.callExpression,
            message: `Avoid mutating arrays with Array.prototype.${match.methodName}().`,
            hint:
              "This is a sign that you're doing something fundamentally procedural when you should " +
              "be taking a more functional approach. Use immutable array operations such as " +
              "Array.prototype.concat(), Array.prototype.slice(), Array.prototype.map(), " +
              "Array.prototype.filter(), or spread syntax instead of manipulating an array in place."
          })
        ),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const mutableArrayMethodCall = (
  context: RuleContext,
  callExpression: ts.CallExpression
): Option.Option<MutableArrayMethodCall> => {
  if (!ts.isPropertyAccessExpression(callExpression.expression)) {
    return Option.none()
  }

  const propertyAccess = callExpression.expression
  const methodName = mutableArrayMethod(propertyAccess.name.text)

  if (Option.isNone(methodName)) {
    return Option.none()
  }

  const receiverType = context.checker.getTypeAtLocation(propertyAccess.expression)

  if (!isArrayType(context.checker, receiverType)) {
    return Option.none()
  }

  return Option.some({
    callExpression,
    methodName: methodName.value
  })
}

const mutableArrayMethod = (methodName: string): Option.Option<MutableArrayMethod> =>
  mutableArrayMethods.has(methodName as MutableArrayMethod)
    ? Option.some(methodName as MutableArrayMethod)
    : Option.none()

const isArrayType = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type> = new Set()
): boolean =>
  Option.match(unseenType(type, seen), {
    onNone: () => false,
    onSome: (type) => {
      const nextSeen = new Set(seen).add(type)
      const isDirectArrayType = checker.isArrayType(type) || checker.isTupleType(type)
      const hasUnionOrIntersectionArrayType = isUnionOrIntersectionArrayType(
        checker,
        type,
        nextSeen
      )
      const hasConstrainedArrayType = isConstrainedArrayType(checker, type, nextSeen)
      const hasApparentArrayType = isApparentArrayType(checker, type, nextSeen)

      return [
        isDirectArrayType,
        hasUnionOrIntersectionArrayType,
        hasConstrainedArrayType,
        hasApparentArrayType
      ].some(Boolean)
    }
  })

const unseenType = (
  type: ts.Type,
  seen: ReadonlySet<ts.Type>
): Option.Option<ts.Type> =>
  Option.liftPredicate((type: ts.Type) => !seen.has(type))(type)

const isUnionOrIntersectionArrayType = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type>
): boolean =>
  Option.match(Option.liftPredicate(isUnionOrIntersectionType)(type), {
    onNone: () => false,
    onSome: (type) => type.types.some((part) => isArrayType(checker, part, seen))
  })

const isUnionOrIntersectionType = (
  type: ts.Type
): type is ts.UnionOrIntersectionType => type.isUnionOrIntersection()

const isConstrainedArrayType = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type>
): boolean =>
  Option.match(Option.fromNullable(checker.getBaseConstraintOfType(type)), {
    onNone: () => false,
    onSome: (constraint) =>
      Option.match(differentType(constraint, type), {
        onNone: () => false,
        onSome: (constraint) => isArrayType(checker, constraint, seen)
      })
  })

const isApparentArrayType = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type>
): boolean =>
  Option.match(differentType(checker.getApparentType(type), type), {
    onNone: () => false,
    onSome: (apparentType) => isArrayType(checker, apparentType, seen)
  })

const differentType = (left: ts.Type, right: ts.Type): Option.Option<ts.Type> =>
  Option.liftPredicate((left: ts.Type) => left !== right)(left)

