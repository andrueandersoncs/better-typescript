import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { differentApparentType, differentBaseConstraint } from "./tsType.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

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
): Option.Option<MutableArrayMethod> => {
  if (!ts.isPropertyAccessExpression(callExpression.expression)) {
    return Option.none()
  }

  const propertyAccess = callExpression.expression
  const methodName = mutableArrayMethod(propertyAccess.name.text)

  if (Option.isNone(methodName)) {
    return Option.none()
  }

  const receiverType = context.checker.getTypeAtLocation(propertyAccess.expression)

  return isArrayType(context.checker, receiverType) ? methodName : Option.none()
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
): boolean => {
  const unionOrIntersection = Option.liftPredicate(isUnionOrIntersectionType)(type)

  return Option.exists(unionOrIntersection, anyPartIsArrayType(checker, seen))
}

const isConstrainedArrayType = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type>
): boolean => {
  const baseConstraint = differentBaseConstraint(checker, type)

  return Option.exists(baseConstraint, isArrayTypePart(checker, seen))
}

const isApparentArrayType = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type>
): boolean => {
  const apparentType = differentApparentType(checker, type)

  return Option.exists(apparentType, isArrayTypePart(checker, seen))
}

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
  (context: RuleContext, callExpression: ts.CallExpression) =>
  (methodName: MutableArrayMethod): RuleMatch =>
    createRuleMatch(context, {
      ruleId,
      node: callExpression,
      message: `Avoid mutating arrays with Array.prototype.${methodName}().`,
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
  mutableArrayMethodCall(context, callExpression).pipe(
    Option.map(mutableArrayRuleMatch(context, callExpression)),
    Option.toArray
  )

const check = onNode([ts.SyntaxKind.CallExpression], ts.isCallExpression, mutableArrayMatches)

const badExample = new ExampleSnippet({
  filePath: "src/items.ts",
  code: `const items: Array<string> = []
items.push("a")
items.push("b")
items.sort()`
})

const goodExample = new ExampleSnippet({
  filePath: "src/items.ts",
  code: `const items = ["a", "b"]
const sorted = [...items].sort()`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noMutableArrayMethods = new Rule({
  id: ruleId,
  description: "Disallow mutable array methods in favor of immutable array operations.",
  example,
  check
})
