import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { differentApparentType, differentBaseConstraint } from "./tsType.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

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

const mutableArrayMethod = (methodName: string): Option.Option<MutableArrayMethod> =>
  mutableArrayMethods.has(methodName as MutableArrayMethod)
    ? Option.some(methodName as MutableArrayMethod)
    : Option.none()

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

const isArrayTypePart =
  (checker: ts.TypeChecker, seen: ReadonlySet<ts.Type>) =>
  (part: ts.Type): boolean =>
    isArrayType(checker, part, seen)

const anyPartIsArrayType =
  (checker: ts.TypeChecker, seen: ReadonlySet<ts.Type>) =>
  (type: ts.UnionOrIntersectionType): boolean =>
    type.types.some(isArrayTypePart(checker, seen))

const isUnionOrIntersectionType = (
  type: ts.Type
): type is ts.UnionOrIntersectionType => type.isUnionOrIntersection()

const isUnionOrIntersectionArrayType = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type>
): boolean =>
  Option.exists(
    Option.liftPredicate(isUnionOrIntersectionType)(type),
    anyPartIsArrayType(checker, seen)
  )

const isConstrainedArrayType = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type>
): boolean => Option.exists(differentBaseConstraint(checker, type), isArrayTypePart(checker, seen))

const isApparentArrayType = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type>
): boolean => Option.exists(differentApparentType(checker, type), isArrayTypePart(checker, seen))

const isArrayType = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type> = new Set()
): boolean => {
  const isUnseen = !seen.has(type)

  return isUnseen && isUnseenArrayType(checker, type, seen)
}

const isUnseenArrayType = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type>
): boolean => {
  const nextSeen = new Set(seen).add(type)
  const isDirectArrayType = checker.isArrayType(type) || checker.isTupleType(type)
  const hasUnionOrIntersectionArrayType = isUnionOrIntersectionArrayType(checker, type, nextSeen)
  const hasConstrainedArrayType = isConstrainedArrayType(checker, type, nextSeen)
  const hasApparentArrayType = isApparentArrayType(checker, type, nextSeen)

  return [
    isDirectArrayType,
    hasUnionOrIntersectionArrayType,
    hasConstrainedArrayType,
    hasApparentArrayType
  ].some(Boolean)
}

const mutableArrayRuleMatch =
  (context: RuleContext) =>
  (match: MutableArrayMethodCall): RuleMatch =>
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

const mutableArrayMatches = (
  callExpression: ts.CallExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  Option.toArray(
    Option.map(mutableArrayMethodCall(context, callExpression), mutableArrayRuleMatch(context))
  )

export const noMutableArrayMethods: Rule = {
  id: ruleId,
  description: "Disallow mutable array methods in favor of immutable array operations.",
  check: onNode([ts.SyntaxKind.CallExpression], ts.isCallExpression, mutableArrayMatches)
}
