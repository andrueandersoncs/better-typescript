import { Option } from "effect"
import * as ts from "typescript"
import { combineAll, onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-hash-set"

// --- new Set(...) detection ---

const isSetIdentifier = (identifier: ts.Identifier): boolean => identifier.text === "Set"

const isSetConstruction = (newExpression: ts.NewExpression): boolean => {
  const constructorIdentifier = Option.liftPredicate(ts.isIdentifier)(newExpression.expression)

  return Option.exists(constructorIdentifier, isSetIdentifier)
}

const constructorMessage = "Avoid constructing a built-in Set."

const constructorHint =
  "Use Effect's HashSet instead — for example HashSet.fromIterable([1, 2, 3]) or " +
  "HashSet.empty(). HashSet integrates with Equal and Hash traits for structural equality."

const newSetMatches = (
  newExpression: ts.NewExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  isSetConstruction(newExpression)
    ? [
        createRuleMatch(context, {
          ruleId,
          node: newExpression,
          message: constructorMessage,
          hint: constructorHint
        })
      ]
    : []

// --- Set<T> / ReadonlySet<T> type reference detection ---

const setTypeNames: ReadonlyArray<string> = ["Set", "ReadonlySet"]

const isSetTypeName = (typeRef: ts.TypeReferenceNode): boolean =>
  ts.isIdentifier(typeRef.typeName) && setTypeNames.includes(typeRef.typeName.text)

const isSetTypeReference = (node: ts.Node): node is ts.TypeReferenceNode =>
  ts.isTypeReferenceNode(node) && isSetTypeName(node)

const typeReferenceName = (typeRef: ts.TypeReferenceNode): string =>
  (typeRef.typeName as ts.Identifier).text

const typeRefMessage = (name: string): string => `Avoid the built-in ${name} type.`

const typeRefHint =
  "Use HashSet.HashSet<T> from Effect instead. HashSet integrates with Equal and Hash " +
  "traits for structural equality."

const setTypeRefMatches = (
  typeRef: ts.TypeReferenceNode,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const name = typeReferenceName(typeRef)
  const message = typeRefMessage(name)

  return [
    createRuleMatch(context, {
      ruleId,
      node: typeRef,
      message,
      hint: typeRefHint
    })
  ]
}

// --- listeners ---

const constructorListener = onNode(
  [ts.SyntaxKind.NewExpression],
  ts.isNewExpression,
  newSetMatches
)

const typeReferenceListener = onNode(
  [ts.SyntaxKind.TypeReference],
  isSetTypeReference,
  setTypeRefMatches
)

const check = combineAll([constructorListener, typeReferenceListener])

// --- examples ---

const badExample = new ExampleSnippet({
  filePath: "src/collections.ts",
  code: `const ids = new Set<number>([1, 2, 3])
const has = ids.has(2)`
})

const goodExample = new ExampleSnippet({
  filePath: "src/collections.ts",
  code: `import { HashSet } from "effect"

const ids = HashSet.make(1, 2, 3)
const has = HashSet.has(ids, 2)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferHashSet = new Rule({
  id: ruleId,
  description:
    "Disallow built-in Set in favor of Effect's HashSet for structural equality.",
  example,
  check
})
