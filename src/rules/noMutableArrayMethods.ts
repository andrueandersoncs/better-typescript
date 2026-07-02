import { HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { CreateMatch } from "./ruleMatch.js"
import {
  differentApparentType,
  differentBaseConstraint,
  isUnseenType
} from "./tsType.js"
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

const mutableArrayMethods = HashSet.make(
  "copyWithin" as MutableArrayMethod,
  "fill" as MutableArrayMethod,
  "pop" as MutableArrayMethod,
  "push" as MutableArrayMethod,
  "reverse" as MutableArrayMethod,
  "shift" as MutableArrayMethod,
  "sort" as MutableArrayMethod,
  "splice" as MutableArrayMethod,
  "unshift" as MutableArrayMethod
)

const isArrayTypeWithSeen =
  (checker: ts.TypeChecker) =>
  (seen: HashSet.HashSet<ts.Type>) =>
  (type: ts.Type): boolean =>
    pipe(
      Option.liftPredicate(isUnseenType(seen))(type),
      Option.exists(computeIsArrayType(checker)(seen))
    )

const isArrayTypePart =
  (checker: ts.TypeChecker) =>
  (seen: HashSet.HashSet<ts.Type>) =>
  (part: ts.Type): boolean =>
    isArrayTypeWithSeen(checker)(seen)(part)

const anyPartIsArrayType =
  (checker: ts.TypeChecker) =>
  (seen: HashSet.HashSet<ts.Type>) =>
  (type: ts.UnionOrIntersectionType): boolean =>
    type.types.some(isArrayTypePart(checker)(seen))

const isUnionOrIntersectionType = (
  type: ts.Type
): type is ts.UnionOrIntersectionType => type.isUnionOrIntersection()

const computeIsArrayType =
  (checker: ts.TypeChecker) =>
  (seen: HashSet.HashSet<ts.Type>) =>
  (type: ts.Type): boolean => {
    const nextSeen = HashSet.add(seen, type)
    const isDirectArrayType =
      checker.isArrayType(type) || checker.isTupleType(type)
    const unionOrIntersection = Option.liftPredicate(isUnionOrIntersectionType)(
      type
    )
    const hasUnionOrIntersectionArrayType = Option.exists(
      unionOrIntersection,
      anyPartIsArrayType(checker)(nextSeen)
    )
    const baseConstraint = differentBaseConstraint(checker)(type)
    const hasConstrainedArrayType = Option.exists(
      baseConstraint,
      isArrayTypePart(checker)(nextSeen)
    )
    const apparentType = differentApparentType(checker)(type)
    const hasApparentArrayType = Option.exists(
      apparentType,
      isArrayTypePart(checker)(nextSeen)
    )

    return [
      isDirectArrayType,
      hasUnionOrIntersectionArrayType,
      hasConstrainedArrayType,
      hasApparentArrayType
    ].some(Boolean)
  }

const isArrayType =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): boolean => {
    const seen = HashSet.empty<ts.Type>()

    return isArrayTypeWithSeen(checker)(seen)(type)
  }

const mutableArrayRuleMatch =
  (match: CreateMatch) =>
  (callExpression: ts.CallExpression) =>
  (methodName: MutableArrayMethod): RuleMatch =>
    match({
      ruleId,
      node: callExpression,
      message: `Avoid mutating arrays with Array.prototype.${methodName}().`,
      hint:
        "This is a sign that you're doing something fundamentally procedural when you should " +
        "be taking a more functional approach. Use Effect's Array module, such as " +
        "Array.append(), Array.map(), Array.filter(), Array.sort(), or spread syntax " +
        "instead of manipulating an array in place."
    })

// The context stage runs once per file, so every partial below is shared by all CallExpressions the dispatcher feeds to matches.
const mutableArrayMatches = (context: RuleContext) => {
  const checker = context.checker
  const isReceiverArrayType = isArrayType(checker)
  const ruleMatch = mutableArrayRuleMatch(createRuleMatch(context))

  const matches = (
    callExpression: ts.CallExpression
  ): ReadonlyArray<RuleMatch> => {
    if (!ts.isPropertyAccessExpression(callExpression.expression)) {
      return []
    }

    const propertyAccess = callExpression.expression
    const methodName = HashSet.has(
      mutableArrayMethods,
      propertyAccess.name.text as MutableArrayMethod
    )
      ? Option.some(propertyAccess.name.text as MutableArrayMethod)
      : Option.none()

    if (Option.isNone(methodName)) {
      return []
    }

    const receiverType = checker.getTypeAtLocation(propertyAccess.expression)

    const methodCall = isReceiverArrayType(receiverType)
      ? methodName
      : Option.none()

    return pipe(
      methodCall,
      Option.map(ruleMatch(callExpression)),
      Option.toArray
    )
  }

  return matches
}

const check = onNode([ts.SyntaxKind.CallExpression])(ts.isCallExpression)(
  mutableArrayMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/items.ts",
  code: `const items: Array<string> = []
items.push("a")
items.push("b")
items.sort()`
})

const goodExample = new ExampleSnippet({
  filePath: "src/items.ts",
  code: `import { Array, Order } from "effect"

const items = ["b", "a"]
const sorted = Array.sort(items, Order.string)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noMutableArrayMethods = new Rule({
  id: ruleId,
  description:
    "Disallow mutable array methods in favor of immutable array operations.",
  example,
  check
})
